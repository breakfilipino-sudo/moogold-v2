export type WalletCryptoOption = {
  asset: "USDT" | "USDC" | "BTC" | "BNB" | "ETH" | "SOL" | "XLM" | "TRX" | "SUI";
  network: "TRON" | "ETHEREUM" | "BITCOIN" | "BNB_SMART_CHAIN" | "SOLANA" | "STELLAR" | "SUI";
  networkLabel: string;
  address: string;
  memo?: string;
};

export const WALLET_CRYPTO_OPTIONS = [
  {
    asset: "USDT",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  {
    asset: "USDC",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "BTC",
    network: "BITCOIN",
    networkLabel: "Bitcoin",
    address: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
  },
  {
    asset: "BNB",
    network: "BNB_SMART_CHAIN",
    networkLabel: "BNB Smart Chain (BEP-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "ETH",
    network: "ETHEREUM",
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  {
    asset: "SOL",
    network: "SOLANA",
    networkLabel: "Solana",
    address: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
  },
  {
    asset: "XLM",
    network: "STELLAR",
    networkLabel: "Stellar",
    address: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: "401607474",
  },
  {
    asset: "TRX",
    network: "TRON",
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  {
    asset: "SUI",
    network: "SUI",
    networkLabel: "Sui",
    address: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
  },
] as const satisfies readonly WalletCryptoOption[];

export function getWalletCryptoOption(
  asset: string,
): WalletCryptoOption | null {
  return WALLET_CRYPTO_OPTIONS.find(
    (option) => option.asset === asset,
  ) ?? null;
}