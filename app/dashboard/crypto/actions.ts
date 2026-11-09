"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { Prisma } from "../../../generated/prisma";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { validateCryptoWithdrawalAddress } from "@/lib/crypto/address-validation";

/*
 * ============================================================
 * SUPPORTED CRYPTO ASSETS
 * ============================================================
 *
 * These values must match the Prisma CryptoAsset enum and
 * CryptoNetwork enum.
 *
 * Withdrawal currently supports the same asset/network pairs
 * as the crypto deposit system.
 */

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}
const WITHDRAWAL_CRYPTO_OPTIONS = {
  USDC: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
  },
  USDT: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC-20)",
  },
  BTC: {
    network: "BITCOIN" as const,
    networkLabel: "Bitcoin",
  },
  ETH: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
  },
  SOL: {
    network: "SOLANA" as const,
    networkLabel: "Solana",
  },
  TRN: {
    network: "TRON" as const,
    networkLabel: "Tron",
  },
  XLM: {
    network: "STELLAR" as const,
    networkLabel: "Stellar",
  },
} as const;

type CryptoAsset = keyof typeof WITHDRAWAL_CRYPTO_OPTIONS;

function isSupportedAsset(value: string): value is CryptoAsset {
  return Object.prototype.hasOwnProperty.call(
    WITHDRAWAL_CRYPTO_OPTIONS,
    value,
  );
}

const STELLAR_DEPOSIT_MEMO = "401607474";

const DEPOSIT_CRYPTO_OPTIONS = {
  BTC: {
    network: "BITCOIN" as const,
    networkLabel: "Bitcoin",
    address: "16GZmP9ybu1m1wYvzG5D4Q6aCrxn3ebYgU",
  },
  USDT: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  BNB: {
    network: "BNB_SMART_CHAIN" as const,
    networkLabel: "BNB Smart Chain (BEP-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  ETH: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  USDC: {
    network: "ETHEREUM" as const,
    networkLabel: "Ethereum (ERC-20)",
    address: "0x4f8179631d4af8e05ae09b1182813ee65d421918",
  },
  SOL: {
    network: "SOLANA" as const,
    networkLabel: "Solana",
    address: "orwuXMAC81ivmAKR5X4oB4hpvRzmfE7jSUXdrjQYgkv",
  },
  XLM: {
    network: "STELLAR" as const,
    networkLabel: "Stellar",
    address: "GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6",
    memo: STELLAR_DEPOSIT_MEMO,
  },
  TRX: {
    network: "TRON" as const,
    networkLabel: "Tron (TRC-20)",
    address: "TJKxnXkwhH8fC9qY9g8YXvCoHSqyZ1oR12",
  },
  SUI: {
    network: "SUI" as const,
    networkLabel: "Sui",
    address: "0xfe65cba4a2b4f67b13e68c548460d129fa0b0b9cae6f6e2d5d8ce0adaa94c8ab",
  },
} as const;

type DepositCryptoAsset = keyof typeof DEPOSIT_CRYPTO_OPTIONS;

function isSupportedDepositAsset(
  value: string,
): value is DepositCryptoAsset {
  return Object.prototype.hasOwnProperty.call(
    DEPOSIT_CRYPTO_OPTIONS,
    value,
  );
}
/*
 * ============================================================
 * CRYPTO WITHDRAWAL FEE
 * ============================================================
 *
 * We keep the fee server-controlled.
 *
 * For now the fee is 0 because we have not yet established
 * MooGold's production crypto withdrawal fee schedule.
 *
 * IMPORTANT:
 * The browser must NEVER be allowed to submit its own fee.
 *
 * When the real fee structure is finalized, this function can
 * be changed to calculate the appropriate fee server-side.
 */

function getCryptoWithdrawalFee(
  asset: CryptoAsset,
  network: string,
): Prisma.Decimal {
  void asset;
  void network;

  return new Prisma.Decimal(0);
}

/*
 * ============================================================
 * AUTHENTICATED MOO GOLD USER
 * ============================================================
 */

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

/*
 * ============================================================
 * SUBMIT CRYPTO DEPOSIT
 * ============================================================
 *
 * Existing working deposit flow.
 *
 * This action ONLY records the customer's deposit report.
 *
 * It NEVER credits the crypto balance.
 * ============================================================
 */

export async function submitCryptoDeposit(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      success: false,
      error: "You must be logged in to make a crypto deposit.",
    };
  }

  const assetInput = String(formData.get("asset") ?? "")
    .trim()
    .toUpperCase();

  if (!isSupportedDepositAsset(assetInput)) {
    return {
      success: false,
      error: "Please select a supported cryptocurrency.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },

    select: {
      id: true,
    },
  });

  if (!user) {
    return {
      success: false,
      error:
        "Your MooGold account profile could not be found. Please sign out and sign in again.",
    };
  }

  const cryptoOption = DEPOSIT_CRYPTO_OPTIONS[assetInput];
  const submittedMemo = String(formData.get("memo") ?? "").trim();
  const expectedMemo = "memo" in cryptoOption ? cryptoOption.memo : null;

  if (expectedMemo && submittedMemo !== expectedMemo) {
    return {
      success: false,
      error: "Enter the exact Stellar memo shown above before submitting.",
    };
  }

  if (!expectedMemo && submittedMemo) {
    return {
      success: false,
      error: "A memo is not required for the selected cryptocurrency.",
    };
  }

  /*
   * MooGold uses the existing shared receiving wallet
   * for each supported asset/network.
   *
   * The customer does not submit an amount.
   *
   * The actual amount is determined from the crypto
   * transaction received by MooGold and verified by
   * the admin/blockchain verification process.
   */


  try {
    const deposit = await prisma.$transaction(async (tx) => {
      const cryptoBalance = await tx.cryptoBalance.upsert({
        where: {
          userId_asset_network: {
            userId: user.id,
            asset: assetInput,
            network: cryptoOption.network,
          },
        },

        update: {},

        create: {
          userId: user.id,
          asset: assetInput,
          network: cryptoOption.network,
          balance: 0,
        },
      });

      return tx.cryptoDeposit.create({
        data: {
          userId: user.id,

          cryptoBalanceId: cryptoBalance.id,

          asset: assetInput,

          network: cryptoOption.network,

          /*
           * Amount intentionally omitted.
           *
           * It will be populated when the incoming blockchain
           * transaction is identified and verified.
           */

          receivingAddress: cryptoOption.address,
          memo: expectedMemo,

          status: "PENDING",

          description:
            `Customer reported sending ${assetInput} ` +
            `via ${cryptoOption.networkLabel}. ` +
            `Awaiting MooGold wallet verification.`,
        },

        select: {
          id: true,
          asset: true,
          network: true,
          amount: true,
          receivingAddress: true,
          memo: true,
          status: true,
          createdAt: true,
        },
      });
    });

    void sendAdminEmailAlert({
      subject: "Crypto deposit awaiting verification",
      message:
        `A new crypto deposit report needs admin verification.\n` +
        `Request ID: ${deposit.id}\n` +
        `Asset: ${deposit.asset}\n` +
        `Network: ${deposit.network}\n` +
        `Status: ${deposit.status}\n` +
        `Verify the received amount before crediting.`,
    });
    return {
      success: true,

      deposit: {
        id: deposit.id,

        asset: deposit.asset,

        network: deposit.network,

        amount: deposit.amount?.toString() ?? null,

        receivingAddress: deposit.receivingAddress,

        memo: deposit.memo,

        status: deposit.status,

        createdAt: deposit.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error(
      "Failed to create crypto deposit:",
      error,
    );

    return {
      success: false,
      error:
        "We could not submit your crypto deposit. Please try again.",
    };
  }
}

/*
 * ============================================================
 * SUBMIT CRYPTO WITHDRAWAL
 * ============================================================
 *
 * IMPORTANT:
 *
 * This action does NOT deduct the user's balance.
 *
 * Flow:
 *
 * User requests withdrawal
 *          Ã¢â€ â€œ
 * Server validates request
 *          Ã¢â€ â€œ
 * Server checks actual balance
 *          Ã¢â€ â€œ
 * CryptoWithdrawal = PENDING
 *          Ã¢â€ â€œ
 * Admin reviews
 *          Ã¢â€ â€œ
 * Admin approves
 *          Ã¢â€ â€œ
 * Balance is deducted
 *          Ã¢â€ â€œ
 * CryptoLedgerEntry = DEBIT
 *          Ã¢â€ â€œ
 * Withdrawal = COMPLETED
 *
 * Rejected withdrawals never affect the balance.
 * ============================================================
 */

export async function submitCryptoWithdrawal(formData: FormData) {
  /*
   * ----------------------------------------------------------
   * AUTHENTICATION
   * ----------------------------------------------------------
   */

  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to make a crypto withdrawal.",
    };
  }

  /*
   * ----------------------------------------------------------
   * READ INPUT
   * ----------------------------------------------------------
   */

  const assetInput = String(formData.get("asset") ?? "")
    .trim()
    .toUpperCase();

  const amountInput = String(formData.get("amount") ?? "").trim();

  const destinationAddress = String(
    formData.get("destinationAddress") ?? "",
  ).trim();

  /*
   * ----------------------------------------------------------
   * VALIDATE ASSET
   * ----------------------------------------------------------
   */

  if (!isSupportedAsset(assetInput)) {
    return {
      success: false,
      error: "Please select a supported cryptocurrency.",
    };
  }

  const cryptoOption = WITHDRAWAL_CRYPTO_OPTIONS[assetInput];

  /*
   * ----------------------------------------------------------
   * VALIDATE AMOUNT
   * ----------------------------------------------------------
   */

  if (!amountInput) {
    return {
      success: false,
      error: "Please enter the amount you want to withdraw.",
    };
  }

  let amount: Prisma.Decimal;

  try {
    /*
     * Decimal is created directly from the submitted string.
     *
     * This avoids JavaScript floating-point calculations.
     */
    amount = new Prisma.Decimal(amountInput);
  } catch {
    return {
      success: false,
      error: "Please enter a valid cryptocurrency amount.",
    };
  }

  if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) {
    return {
      success: false,
      error: "Please enter a valid cryptocurrency amount.",
    };
  }

  /*
   * Absolute safety limit.
   */

  if (amount.greaterThan("1000000000")) {
    return {
      success: false,
      error: "The withdrawal amount is too large.",
    };
  }

  /*
   * ----------------------------------------------------------
   * VALIDATE DESTINATION ADDRESS
   * ----------------------------------------------------------
   *
   * Use server-side, asset-specific blockchain address validation.
   * This remains before fee calculation, balance reservation, and
   * pending withdrawal creation.
   */

  const addressValidation = validateCryptoWithdrawalAddress(
    assetInput,
    destinationAddress,
  );

  if (!addressValidation.valid) {
    return {
      success: false,
      error:
        addressValidation.error ??
        "The destination wallet address is invalid for the selected network.",
    };
  }
  /*
   * ----------------------------------------------------------
   * SERVER-CONTROLLED FEE
   * ----------------------------------------------------------
   */

  const fee = getCryptoWithdrawalFee(assetInput, cryptoOption.network);

  const totalAmount = amount.add(fee);

  /*
   * ----------------------------------------------------------
   * CREATE PENDING WITHDRAWAL
   * ----------------------------------------------------------
   *
   * Balance is checked inside the transaction.
   *
   * The balance is NOT deducted here.
   */

  try {
    const withdrawal = await prisma.$transaction(async (tx) => {
      /*
       * Find the exact asset/network balance.
       */

      const cryptoBalance = await tx.cryptoBalance.findUnique({
        where: {
          userId_asset_network: {
            userId: user.id,
            asset: assetInput,
            network: cryptoOption.network,
          },
        },
      });

      if (!cryptoBalance) {
        throw new Error("CRYPTO_BALANCE_NOT_FOUND");
      }

      /*
       * Check that the user's balance can cover:
       *
       * withdrawal amount + fee
       */

      const availableBalance = cryptoBalance.balance.sub(
        cryptoBalance.reservedBalance,
      );

      if (availableBalance.lessThan(totalAmount)) {
        throw new Error("INSUFFICIENT_CRYPTO_BALANCE");
      }

      /*
       * Reserve funds within the transaction.
       * Actual balance deduction still happens only on approval.
       */
      const reservationUpdate = await tx.cryptoBalance.updateMany({
        where: {
          id: cryptoBalance.id,
          balance: cryptoBalance.balance,
          reservedBalance: cryptoBalance.reservedBalance,
        },
        data: {
          reservedBalance: cryptoBalance.reservedBalance.add(totalAmount),
        },
      });

      if (reservationUpdate.count !== 1) {
        throw new Error("CRYPTO_RESERVATION_CONFLICT");
      }

      /*
       * Create the pending withdrawal.
       *
       * IMPORTANT:
       *
       * No balance update happens here.
       */

      return tx.cryptoWithdrawal.create({
        data: {
          userId: user.id,

          cryptoBalanceId: cryptoBalance.id,

          asset: assetInput,

          network: cryptoOption.network,

          amount,

          fee,

          totalAmount,

          destinationAddress,

          status: "PENDING",

          description: `Customer requested withdrawal of ${amount.toString()} ${assetInput} via ${cryptoOption.networkLabel}.`,
        },

        select: {
          id: true,
          asset: true,
          network: true,
          amount: true,
          fee: true,
          totalAmount: true,
          destinationAddress: true,
          status: true,
          createdAt: true,
        },
      });
    });

    void sendAdminEmailAlert({
      subject: "Crypto withdrawal awaiting review",
      message:
        `A crypto withdrawal request needs admin review.\n` +
        `Request ID: ${withdrawal.id}\n` +
        `Asset: ${withdrawal.asset}\n` +
        `Network: ${withdrawal.network}\n` +
        `Amount: ${withdrawal.amount.toString()}\n` +
        `Fee: ${withdrawal.fee.toString()}\n` +
        `Status: ${withdrawal.status}\n` +
        `Review destination details in the admin portal.`,
    });
    return {
      success: true,

      withdrawal: {
        id: withdrawal.id,

        asset: withdrawal.asset,

        network: withdrawal.network,

        amount: withdrawal.amount.toString(),

        fee: withdrawal.fee.toString(),

        totalAmount: withdrawal.totalAmount.toString(),

        destinationAddress: withdrawal.destinationAddress,

        status: withdrawal.status,

        createdAt: withdrawal.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to create crypto withdrawal:", error);

    if (isTransactionConflict(error)) {
      return {
        success: false,
        error: "Your withdrawal could not be processed because the balance changed during a concurrent transaction. Please refresh your balance and try again.",
      };
    }

    if (
      error instanceof Error &&
      error.message === "CRYPTO_BALANCE_NOT_FOUND"
    ) {
      return {
        success: false,
        error: `You do not currently have a ${assetInput} / ${cryptoOption.network} balance.`,
      };
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_CRYPTO_BALANCE"
    ) {
      return {
        success: false,
        error: `Insufficient ${assetInput} balance for this withdrawal, including the network fee.`,
      };
    }

    if (
      error instanceof Error &&
      error.message === "CRYPTO_RESERVATION_CONFLICT"
    ) {
      return {
        success: false,
        error: "Your balance changed while submitting this withdrawal. Please check your available balance and try again.",
      };
    }

    return {
      success: false,
      error: "We could not submit your crypto withdrawal. Please try again.",
    };
  }
}
