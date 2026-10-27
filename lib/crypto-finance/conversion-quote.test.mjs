import test from "node:test";
import assert from "node:assert/strict";
import { createConversionQuote, isConversionQuoteExpired } from "./conversion-quote.ts";

const now = new Date("2026-10-17T12:00:00.000Z");
const fresh = new Date(now.getTime() - 60_000);

function makeInput(overrides = {}) {
  return {
    asset: "BTC",
    cryptoAmount: "0.1",
    cryptoUsdPrice: {
      rate: 50000,
      source: "test-price",
      observedAt: fresh,
    },
    usdToLocalRate: {
      rate: 1500,
      source: "test-fx",
      observedAt: fresh,
    },
    payoutCurrency: "NGN",
    feeUsd: "10",
    now,
    ...overrides,
  };
}

test("calculates USD value, fee and NGN payout with fixed-point arithmetic", () => {
  const quote = createConversionQuote(makeInput());

  assert.equal(quote.usdValue, "5000");
  assert.equal(quote.feeUsd, "10");
  assert.equal(quote.payoutCurrency, "NGN");
  assert.equal(quote.payoutAmount, "7485000");
  assert.equal(quote.settlementReady, false);
});

test("rounds VND to zero decimal places", () => {
  const quote = createConversionQuote(makeInput({
    usdToLocalRate: { rate: 25000, source: "test-fx", observedAt: fresh },
    payoutCurrency: "VND",
  }));

  assert.equal(quote.payoutAmount, "124750000");
});

test("rejects fees equal to or greater than the conversion value", () => {
  assert.throws(
    () => createConversionQuote(makeInput({ feeUsd: "5000" })),
    /fee must be less than/i,
  );
});

test("rejects unsupported payout currencies", () => {
  assert.throws(
    () => createConversionQuote(makeInput({ payoutCurrency: "XYZ" })),
    /unsupported payout currency/i,
  );
});

test("rejects stale crypto prices", () => {
  const stale = new Date(now.getTime() - 11 * 60 * 1000);

  assert.throws(
    () => createConversionQuote(makeInput({
      cryptoUsdPrice: { rate: 50000, source: "test-price", observedAt: stale },
    })),
    /too old/i,
  );
});

test("rejects stale FX observations", () => {
  const stale = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  assert.throws(
    () => createConversionQuote(makeInput({
      usdToLocalRate: { rate: 1500, source: "test-fx", observedAt: stale },
    })),
    /too old/i,
  );
});

test("rejects future-dated rate observations", () => {
  const future = new Date(now.getTime() + 2 * 60 * 1000);

  assert.throws(
    () => createConversionQuote(makeInput({
      cryptoUsdPrice: { rate: 50000, source: "test-price", observedAt: future },
    })),
    /future/i,
  );
});

test("expires a quote at its exact expiry time", () => {
  const quote = createConversionQuote(makeInput());

  assert.equal(
    isConversionQuoteExpired(quote, new Date(quote.expiresAt)),
    true,
  );
  assert.equal(
    isConversionQuoteExpired(quote, new Date(now.getTime() + 59_999)),
    false,
  );
});
