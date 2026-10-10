import "server-only";

import { prisma } from "@/lib/prisma";

export interface GoldMarketData {
  price: number;
  bid: number | null;
  ask: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: string;
}

interface MetalsDevResponse {
  status?: string;
  timestamp?: string;
  rate?: {
    price?: number;
    bid?: number;
    ask?: number;
    high?: number;
    low?: number;
    change?: number;
    change_percent?: number;
  };
}

interface GoldApiResponse {
  price?: number;
  bid?: number;
  ask?: number;
  high_price?: number;
  low_price?: number;
  ch?: number;
  chp?: number;
  timestamp?: number;
}

const METALS_DEV_URL = "https://api.metals.dev/v1/metal/spot";
const GOLD_API_URL = "https://api.gold-api.com/price/XAU/USD";

const PRIMARY_TIMEOUT_MS = 2_500;
const FALLBACK_TIMEOUT_MS = 5_000;
const CACHE_SECONDS = 60;

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function fetchMetalsDev(): Promise<GoldMarketData | null> {
  const apiKey = process.env.METALS_DEV_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = new URL(METALS_DEV_URL);

  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("metal", "gold");
  url.searchParams.set("currency", "USD");

  const timeout = timeoutSignal(PRIMARY_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: CACHE_SECONDS,
      },
      signal: timeout.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as MetalsDevResponse;

    if (data.status !== "success" || !data.rate) {
      return null;
    }

    const price = finiteNumber(data.rate.price);

    if (price === null || price <= 0) {
      return null;
    }

    return {
      price,
      bid: finiteNumber(data.rate.bid),
      ask: finiteNumber(data.rate.ask),
      high: finiteNumber(data.rate.high),
      low: finiteNumber(data.rate.low),
      change: finiteNumber(data.rate.change),
      changePercent: finiteNumber(data.rate.change_percent),
      timestamp:
        typeof data.timestamp === "string" && data.timestamp.length > 0
          ? data.timestamp
          : new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function fetchGoldApi(): Promise<GoldMarketData | null> {
  const timeout = timeoutSignal(FALLBACK_TIMEOUT_MS);

  try {
    const response = await fetch(GOLD_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: CACHE_SECONDS,
      },
      signal: timeout.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoldApiResponse;

    const price = finiteNumber(data.price);

    if (price === null || price <= 0) {
      return null;
    }

    return {
      price,
      bid: finiteNumber(data.bid),
      ask: finiteNumber(data.ask),
      high: finiteNumber(data.high_price),
      low: finiteNumber(data.low_price),
      change: finiteNumber(data.ch),
      changePercent: finiteNumber(data.chp),
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp * 1000).toISOString()
          : new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function saveSnapshot(price: number, source: string) {
  try {
    const latest = await prisma.goldMarketSnapshot.findFirst({
      orderBy: {
        capturedAt: "desc",
      },
      select: {
        price: true,
        capturedAt: true,
      },
    });

    const now = Date.now();

    if (
      latest &&
      now - latest.capturedAt.getTime() < SNAPSHOT_INTERVAL_MS
    ) {
      return;
    }

    await prisma.goldMarketSnapshot.create({
      data: {
        price,
        source,
        capturedAt: new Date(),
      },
    });
  } catch {
    // Market data should continue working even if snapshot storage fails.
  }
}

async function getRolling24HourChange(
  currentPrice: number,
): Promise<{
  change: number | null;
  changePercent: number | null;
}> {
  try {
    const targetTime = new Date(Date.now() - CHANGE_WINDOW_MS);

    const reference = await prisma.goldMarketSnapshot.findFirst({
      where: {
        capturedAt: {
          lte: targetTime,
        },
      },
      orderBy: {
        capturedAt: "desc",
      },
      select: {
        price: true,
        capturedAt: true,
      },
    });

    if (!reference) {
      return {
        change: null,
        changePercent: null,
      };
    }

    const referencePrice = Number(reference.price);

    if (
      !Number.isFinite(referencePrice) ||
      referencePrice <= 0 ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      return {
        change: null,
        changePercent: null,
      };
    }

    const change = currentPrice - referencePrice;
    const changePercent = (change / referencePrice) * 100;

    return {
      change,
      changePercent,
    };
  } catch {
    return {
      change: null,
      changePercent: null,
    };
  }
}

export async function getGoldMarketData(): Promise<GoldMarketData | null> {
  let market: GoldMarketData | null = null;
  let source = "unknown";

  // Primary provider.
  const primary = await fetchMetalsDev();

  if (primary) {
    market = primary;
    source = "metals.dev";
  }

  // Fallback provider.
  if (!market) {
    const fallback = await fetchGoldApi();

    if (fallback) {
      market = fallback;
      source = "gold-api";
    }
  }

  if (!market) {
    return null;
  }

  const rollingChange = await getRolling24HourChange(market.price);

  // Store the current price for future rolling 24h calculations.
  await saveSnapshot(market.price, source);

  return {
    ...market,
    change: rollingChange.change,
    changePercent: rollingChange.changePercent,
  };
}