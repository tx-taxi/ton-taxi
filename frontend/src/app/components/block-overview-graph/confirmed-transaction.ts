import { TransactionStripped } from '@interfaces/node-api.interface';

export type ConfirmedTransactionCategory = 'transfer' | 'jetton' | 'nft' | 'contract' | 'other';

/**
 * Metadata displayed for a bounded, confirmed TON transaction sample. Layout
 * weight is intentionally separate from protocol fields: TON responses here do
 * not provide Bitcoin vsize, byte weight, or a fee rate.
 */
export interface ConfirmedTransactionMetadata {
  hash: string;
  totalFeesAtomic: string | null;
  incomingMessage: any | null;
  outgoingMessages: any[];
  success: boolean | null;
  utime: number | null;
  category: ConfirmedTransactionCategory;
}

export interface ConfirmedGraphTransaction extends TransactionStripped {
  /** Unitless, relative area used only by the WebGL treemap layout. */
  layoutWeight: number;
  confirmed: ConfirmedTransactionMetadata;
}

export function confirmedTransactionCategory(transaction: any): ConfirmedTransactionCategory {
  const operation = [
    transaction?.in_msg?.decoded_op_name,
    ...(transaction?.out_msgs || []).map((message: any) => message?.decoded_op_name),
  ].filter(Boolean).join(' ').toLowerCase();
  if (operation.includes('jetton')) return 'jetton';
  if (operation.includes('nft')) return 'nft';
  if (transaction?.account?.is_wallet === false) return 'contract';
  if (transaction?.account?.is_wallet === true && (transaction?.in_msg?.msg_type === 'int_msg' || (transaction?.out_msgs || []).some((message: any) => message?.msg_type === 'int_msg'))) return 'transfer';
  return 'other';
}

function atomic(value: unknown): bigint | null {
  return typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : null;
}

function unixSeconds(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** Maps raw confirmed records into the existing scene without inventing bytes or fee rates. */
export function confirmedGraphTransactions(transactions: any[], category: ConfirmedTransactionCategory | 'all' = 'all'): ConfirmedGraphTransaction[] {
  const seen = new Set<string>();
  const selected = (transactions || []).map((transaction) => ({ transaction, category: confirmedTransactionCategory(transaction) }))
    .filter(({ transaction, category: currentCategory }) => {
      const hash = typeof transaction?.hash === 'string' ? transaction.hash : '';
      return !!hash && !seen.has(hash) && (seen.add(hash), category === 'all' || currentCategory === category);
    });
  const fees = selected.map(({ transaction }) => atomic(transaction?.total_fees));
  const largestFee = fees.reduce<bigint>((largest, fee) => fee !== null && fee > largest ? fee : largest, 0n);

  return selected.map(({ transaction, category: currentCategory }, index) => {
    const fee = fees[index];
    // Every returned transaction remains targetable. Fees determine relative area
    // when known; unknown/zero fees receive the smallest readable tile.
    const layoutWeight = largestFee > 0n && fee !== null
      ? 1 + Number((fee * 31n) / largestFee)
      : 1;
    return {
      txid: transaction.hash,
      // Structural fallbacks for the existing scene only. Tooltip branches on
      // `confirmed`, so these cannot be presented as TON protocol measurements.
      fee: 0,
      vsize: 1,
      value: 0,
      flags: 0,
      time: unixSeconds(transaction?.utime) ?? 0,
      layoutWeight,
      confirmed: {
        hash: transaction.hash,
        totalFeesAtomic: fee?.toString() ?? null,
        incomingMessage: transaction?.in_msg || null,
        outgoingMessages: Array.isArray(transaction?.out_msgs) ? transaction.out_msgs : [],
        success: typeof transaction?.success === 'boolean' ? transaction.success : null,
        utime: unixSeconds(transaction?.utime),
        category: currentCategory,
      },
    };
  });
}

export function confirmedGraphBlockLimit(transactions: ConfirmedGraphTransaction[]): number {
  // The scene capacity is relative to the layout-only weights, leaving enough
  // space for tile padding without representing a network block-size limit.
  return Math.max(1, Math.ceil(transactions.reduce((total, transaction) => total + transaction.layoutWeight, 0) / 0.72));
}
