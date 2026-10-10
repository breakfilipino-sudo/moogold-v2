"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGoldMarketData } from "@/lib/markets/gold";

type GoldTradeResult = {
  success: boolean;
  message: string;
  reference?: string;
  quantity?: number;
  amount?: number;
  price?: number;
};

const MIN_TRADE_USD = 1;
const MAX_TRADE_USD = 1_000_000;

const GOLD_DECIMAL_PLACES = 8;
const GOLD_EPSILON = 0.00000001;

function toNumber(value: unknown): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeAmount(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return NaN;
  }

  const cleaned = value.replace(/,/g, "").trim();

  if (!cleaned) {
    return NaN;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : NaN;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundGold(value: number): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 10 ** GOLD_DECIMAL_PLACES,
    ) /
    10 ** GOLD_DECIMAL_PLACES
  );
}

function createTradeReference(prefix: "BUY" | "SELL"): string {
  return `GOLD-${prefix}-${Date.now()}-${randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase()}`;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
    },
  });

  return user;
}

async function getUsableGoldPrices() {
  const market = await getGoldMarketData();

  if (!market) {
    return null;
  }

  if (!Number.isFinite(market.price) || market.price <= 0) {
    return null;
  }

  /*
   * Buy orders use ASK when the provider supplies it.
   * Sell orders use BID when the provider supplies it.
   *
   * If either side is unavailable, we safely fall back
   * to the provider's main spot price.
   */
  const buyPrice =
    typeof market.ask === "number" &&
    Number.isFinite(market.ask) &&
    market.ask > 0
      ? market.ask
      : market.price;

  const sellPrice =
    typeof market.bid === "number" &&
    Number.isFinite(market.bid) &&
    market.bid > 0
      ? market.bid
      : market.price;

  return {
    market,
    buyPrice,
    sellPrice,
  };
}

/**
 * ============================================================
 * BUY GOLD
 * ============================================================
 *
 * The user spends available CASH and receives gold.
 *
 * Example:
 *
 * $1,000 / $4,000 per oz
 * = 0.25 oz
 *
 * Cash:
 * $5,000 -> $4,000
 *
 * Gold:
 * 0 oz -> 0.25 oz
 *
 * The wallet's total economic value does not change merely
 * because cash is converted into gold.
 */
export async function buyGold(
  formData: FormData,
): Promise<GoldTradeResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const amount = normalizeAmount(formData.get("amount"));

  if (!Number.isFinite(amount)) {
    return {
      success: false,
      message: "Enter a valid USD amount.",
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      message: "Gold purchase amount must be greater than zero.",
    };
  }

  if (amount < MIN_TRADE_USD) {
    return {
      success: false,
      message: `The minimum gold purchase is $${MIN_TRADE_USD.toFixed(
        2,
      )}.`,
    };
  }

  if (amount > MAX_TRADE_USD) {
    return {
      success: false,
      message: `The maximum gold purchase is $${MAX_TRADE_USD.toLocaleString()}.`,
    };
  }

  const prices = await getUsableGoldPrices();

  if (!prices) {
    return {
      success: false,
      message:
        "Live gold pricing is temporarily unavailable. Please try again.",
    };
  }

  const goldPrice = prices.buyPrice;
  const quantity = roundGold(amount / goldPrice);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      message:
        "We could not calculate the gold quantity for this purchase. Please try again.",
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (!wallet) {
          throw new Error(
            "Your wallet has not been created yet. Please contact MooGold support.",
          );
        }

        const cashBefore = toNumber(wallet.cashBalance);

        if (cashBefore < amount) {
          throw new Error(
            "Insufficient available balance for this gold purchase.",
          );
        }

        const holding = await tx.goldHolding.upsert({
          where: {
            userId: user.id,
          },
          create: {
            userId: user.id,
            quantity: 0,
            value: 0,
            currency: "USD",
          },
          update: {},
        });

        const currentQuantity = toNumber(holding.quantity);

        const newQuantity = roundGold(
          currentQuantity + quantity,
        );

        const cashAfter = roundMoney(cashBefore - amount);

        /*
         * Gold value is recalculated using the current spot
         * price so the stored holding value represents the
         * latest available market valuation at the moment
         * of the transaction.
         */
        const currentMarketValue = roundMoney(
          newQuantity * prices.market.price,
        );

        const reference = createTradeReference("BUY");

        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            type: "GOLD_PURCHASE",
            status: "COMPLETED",
            balanceType: "CASH",
            amount: roundMoney(amount),
            currency: "USD",
            usdAmount: roundMoney(amount),
            exchangeRate: goldPrice,
            description: `Gold purchase of ${quantity.toFixed(
              GOLD_DECIMAL_PLACES,
            )} oz at $${goldPrice.toFixed(2)}/oz`,
            reference,
            approvedAt: new Date(),
          },
        });

        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            balanceType: "CASH",
            direction: "DEBIT",
            amount: roundMoney(amount),
            currency: "USD",
            balanceBefore: roundMoney(cashBefore),
            balanceAfter: cashAfter,
            description: `Gold purchase - ${quantity.toFixed(
              GOLD_DECIMAL_PLACES,
            )} oz`,
          },
        });

        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            cashBalance: cashAfter,
          },
        });

        await tx.goldHolding.update({
          where: {
            userId: user.id,
          },
          data: {
            quantity: newQuantity,
            value: currentMarketValue,
          },
        });

        return {
          reference,
          quantity,
          amount: roundMoney(amount),
          price: goldPrice,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/gold");
    revalidatePath("/dashboard/gold/buy");
    revalidatePath("/dashboard/gold/sell");
    revalidatePath("/dashboard/wallet");

    return {
      success: true,
      message: "Gold purchase completed successfully.",
      reference: result.reference,
      quantity: result.quantity,
      amount: result.amount,
      price: result.price,
    };
  } catch (error) {
    console.error("Gold purchase failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "We could not complete your gold purchase.";

    return {
      success: false,
      message,
    };
  }
}

/**
 * ============================================================
 * SELL GOLD
 * ============================================================
 *
 * The user sells an existing gold quantity.
 *
 * The BID price is used when available because the user is
 * selling gold into the market.
 */
export async function sellGold(
  formData: FormData,
): Promise<GoldTradeResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const quantityInput = normalizeAmount(formData.get("quantity"));

  if (!Number.isFinite(quantityInput)) {
    return {
      success: false,
      message: "Enter a valid gold quantity.",
    };
  }

  if (quantityInput <= 0) {
    return {
      success: false,
      message: "Gold quantity must be greater than zero.",
    };
  }

  const quantity = roundGold(quantityInput);

  if (quantity <= 0) {
    return {
      success: false,
      message: "Gold quantity is too small to process.",
    };
  }

  const prices = await getUsableGoldPrices();

  if (!prices) {
    return {
      success: false,
      message:
        "Live gold pricing is temporarily unavailable. Please try again.",
    };
  }

  const goldPrice = prices.sellPrice;
  const proceeds = roundMoney(quantity * goldPrice);

  if (!Number.isFinite(proceeds) || proceeds <= 0) {
    return {
      success: false,
      message:
        "We could not calculate the sale proceeds. Please try again.",
    };
  }

  if (proceeds < MIN_TRADE_USD) {
    return {
      success: false,
      message: `The minimum gold sale is $${MIN_TRADE_USD.toFixed(
        2,
      )}.`,
    };
  }

  if (proceeds > MAX_TRADE_USD) {
    return {
      success: false,
      message: `This sale exceeds the $${MAX_TRADE_USD.toLocaleString()} transaction limit.`,
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (!wallet) {
          throw new Error(
            "Your wallet has not been created yet. Please contact MooGold support.",
          );
        }

        const holding = await tx.goldHolding.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (!holding) {
          throw new Error(
            "You do not currently have any gold holdings.",
          );
        }

        const currentQuantity = toNumber(holding.quantity);

        if (currentQuantity <= 0) {
          throw new Error(
            "You do not currently have any gold available to sell.",
          );
        }

        if (
          quantity >
          currentQuantity + GOLD_EPSILON
        ) {
          throw new Error(
            `You only have ${currentQuantity.toFixed(
              GOLD_DECIMAL_PLACES,
            )} oz of gold available.`,
          );
        }

        const remainingQuantity = roundGold(
          Math.max(0, currentQuantity - quantity),
        );

        /*
         * Revalue the remaining gold using the latest market
         * price after the sale.
         */
        const remainingValue = roundMoney(
          remainingQuantity * prices.market.price,
        );

        const cashBefore = toNumber(wallet.cashBalance);
        const cashAfter = roundMoney(
          cashBefore + proceeds,
        );

        const reference = createTradeReference("SELL");

        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            type: "GOLD_SALE",
            status: "COMPLETED",
            balanceType: "CASH",
            amount: proceeds,
            currency: "USD",
            usdAmount: proceeds,
            exchangeRate: goldPrice,
            description: `Gold sale of ${quantity.toFixed(
              GOLD_DECIMAL_PLACES,
            )} oz at $${goldPrice.toFixed(2)}/oz`,
            reference,
            approvedAt: new Date(),
          },
        });

        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            transactionId: transaction.id,
            balanceType: "CASH",
            direction: "CREDIT",
            amount: proceeds,
            currency: "USD",
            balanceBefore: roundMoney(cashBefore),
            balanceAfter: cashAfter,
            description: `Gold sale - ${quantity.toFixed(
              GOLD_DECIMAL_PLACES,
            )} oz`,
          },
        });

        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            cashBalance: cashAfter,
          },
        });

        await tx.goldHolding.update({
          where: {
            userId: user.id,
          },
          data: {
            quantity: remainingQuantity,
            value: remainingValue,
          },
        });

        return {
          reference,
          quantity,
          amount: proceeds,
          price: goldPrice,
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/gold");
    revalidatePath("/dashboard/gold/buy");
    revalidatePath("/dashboard/gold/sell");
    revalidatePath("/dashboard/wallet");

    return {
      success: true,
      message: "Gold sale completed successfully.",
      reference: result.reference,
      quantity: result.quantity,
      amount: result.amount,
      price: result.price,
    };
  } catch (error) {
    console.error("Gold sale failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "We could not complete your gold sale.";

    return {
      success: false,
      message,
    };
  }
}