import { isAddress as isEthereumAddress } from "ethers";
import { Network, validate as validateBitcoinAddress } from "bitcoin-address-validation";
import { TronWeb } from "tronweb";
import { isAddress as isSolanaAddress } from "@solana/addresses";
import { StrKey } from "@stellar/stellar-sdk";

export type CryptoAddressValidation = {
  valid: boolean;
  error?: string;
};

const INVALID_ADDRESS_MESSAGE =
  "The destination wallet address is not valid for the selected cryptocurrency and network.";

/**
 * Validate a destination address against the selected MooGold asset.
 * This is format/network validation only; it does not verify ownership,
 * available liquidity, or whether a destination can receive a transfer.
 */
export function validateCryptoWithdrawalAddress(
  asset: string,
  address: string,
): CryptoAddressValidation {
  const normalizedAsset = asset.trim().toUpperCase();
  const normalizedAddress = address.trim();

  if (!normalizedAddress || normalizedAddress.length > 255) {
    return { valid: false, error: INVALID_ADDRESS_MESSAGE };
  }

  try {
    let valid = false;

    switch (normalizedAsset) {
      case "ETH":
      case "USDC":
        valid = isEthereumAddress(normalizedAddress);
        break;

      case "BTC":
        valid = validateBitcoinAddress(normalizedAddress, Network.mainnet);
        break;

      case "USDT":
      case "TRN":
        valid = TronWeb.isAddress(normalizedAddress);
        break;

      case "SOL":
        valid = isSolanaAddress(normalizedAddress);
        break;

      case "XLM":
        valid = StrKey.isValidEd25519PublicKey(normalizedAddress);
        break;

      default:
        return {
          valid: false,
          error: "Please select a supported cryptocurrency.",
        };
    }

    return valid
      ? { valid: true }
      : { valid: false, error: INVALID_ADDRESS_MESSAGE };
  } catch {
    return { valid: false, error: INVALID_ADDRESS_MESSAGE };
  }
}