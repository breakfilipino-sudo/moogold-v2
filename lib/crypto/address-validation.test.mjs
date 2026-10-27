import test from "node:test";
import assert from "node:assert/strict";
import { validateCryptoWithdrawalAddress } from "./address-validation.ts";

const validAddresses = [
  ["ETH", "0xae70A129dfd37186C70697494B08c4151C408717"],
  ["USDC", "0x12C844aeA5FFe9271fb6f2F1e1fd1811512B4ad1"],
  ["BTC", "33a54tDd51n13TMYi6KqZ3WUdo2LpQcnqC"],
  ["USDT", "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg"],
  ["TRN", "TLGGvkFbJWtT3jvxx8uss14Mshmrz7Kenx"],
  ["SOL", "GFenbSRhcZwPg7KE85AJS4AB7khUeVdBkUSQjuJj2xDj"],
  ["XLM", "GD5LP2XKZV2QJBY3VIJTTC6ECN3LGJQMCJXSAYPPXZHWGVTJOQM5H3MP"],
];

for (const [asset, address] of validAddresses) {
  test(`accepts configured ${asset} address format`, () => {
    assert.equal(validateCryptoWithdrawalAddress(asset, address).valid, true);
  });
}

const invalidAddresses = [
  ["ETH", "not-an-ethereum-address"],
  ["USDC", "TKrbT8qikYzZd8tBwPQ2teaLZCV4aJ5NKg"],
  ["BTC", "not-a-bitcoin-address"],
  ["BTC", "0xae70A129dfd37186C70697494B08c4151C408717"],
  ["USDT", "not-a-tron-address"],
  ["TRN", "0xae70A129dfd37186C70697494B08c4151C408717"],
  ["SOL", "not-a-solana-address"],
  ["XLM", "not-a-stellar-address"],
  ["UNKNOWN", "some-destination-address"],
  ["ETH", ""],
  ["ETH", "x".repeat(256)],
];

for (const [asset, address] of invalidAddresses) {
  test(`rejects invalid ${asset} address input`, () => {
    assert.equal(validateCryptoWithdrawalAddress(asset, address).valid, false);
  });
}