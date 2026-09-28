/** Pure, chain-owned projection of a bounded cross-shard confirmation window. */
export interface ConfirmedTransactionWindowSource {
  kind: 'confirmed-masterchain';
  masterSeqno: string | null;
  requestedLimit: number;
  returned: number;
  /** Complete only for transactions confirmed by the selected masterchain block. */
  complete: boolean;
  partial: boolean;
  observedAt?: string;
  stale?: boolean;
}

export interface FeeStatistics {
  count: number;
  sum: string;
  min: string | null;
  /** Atomic nanograms, floored only when the exact ratio has a remainder. */
  median: string | null;
  mean: string | null;
  max: string | null;
  /** Preserves the exact rational value without Number conversion. */
  medianExact: { remainder: string; denominator: string } | null;
  meanExact: { remainder: string; denominator: string } | null;
}

export interface ConfirmedDashboardData {
  fees: FeeStatistics;
  phaseFees: Record<'compute' | 'storage' | 'action', { count: number; sum: string | null }>;
  messages: { incoming: number; outgoing: number; internal: number; external: number };
  status: { successful: number; failed: number; unknown: number };
  categories: Record<'Transfer' | 'Jetton' | 'NFT' | 'Contract' | 'Other', number>;
  source: ConfirmedTransactionWindowSource;
}

const atomic = (value: unknown): bigint | null => typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : null;

function exactAtomic(numerator: bigint, denominator: bigint): { value: string; remainder: string; denominator: string } | null {
  if (denominator <= 0n) return null;
  return { value: (numerator / denominator).toString(), remainder: (numerator % denominator).toString(), denominator: denominator.toString() };
}

/**
 * This adapter deliberately consumes only returned confirmed records. It does
 * not infer a mempool, fee priority, byte weight, capacity, or network total.
 */
export function confirmedDashboardData(transactions: any[], source: ConfirmedTransactionWindowSource): ConfirmedDashboardData {
  const fees: bigint[] = [];
  const phase = { compute: { count: 0, sum: 0n }, storage: { count: 0, sum: 0n }, action: { count: 0, sum: 0n } };
  const messages = { incoming: 0, outgoing: 0, internal: 0, external: 0 };
  const status = { successful: 0, failed: 0, unknown: 0 };
  const categories = { Transfer: 0, Jetton: 0, NFT: 0, Contract: 0, Other: 0 };

  for (const transaction of transactions || []) {
    const fee = atomic(transaction?.total_fees);
    if (fee !== null) fees.push(fee);
    for (const [key, value] of [['compute', transaction?.compute_phase?.gas_fees], ['storage', transaction?.storage_phase?.fees_collected], ['action', transaction?.action_phase?.total_fees]] as const) {
      const amount = atomic(value);
      if (amount !== null) { phase[key].count++; phase[key].sum += amount; }
    }
    if (transaction?.success === true) status.successful++;
    else if (transaction?.success === false) status.failed++;
    else status.unknown++;
    if (transaction?.in_msg) { messages.incoming++; if (transaction.in_msg.msg_type === 'int_msg') messages.internal++; else messages.external++; }
    for (const message of transaction?.out_msgs || []) { messages.outgoing++; if (message?.msg_type === 'int_msg') messages.internal++; else messages.external++; }

    const operation = [transaction?.in_msg?.decoded_op_name, ...(transaction?.out_msgs || []).map(message => message?.decoded_op_name)].filter(Boolean).join(' ').toLowerCase();
    if (operation.includes('jetton')) categories.Jetton++;
    else if (operation.includes('nft')) categories.NFT++;
    else if (transaction?.account?.is_wallet === false) categories.Contract++;
    else if ((transaction?.in_msg?.msg_type === 'int_msg' || (transaction?.out_msgs || []).some(message => message?.msg_type === 'int_msg')) && transaction?.account?.is_wallet === true) categories.Transfer++;
    else categories.Other++;
  }

  fees.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const sum = fees.reduce((total, fee) => total + fee, 0n);
  const middle = Math.floor(fees.length / 2);
  const median = !fees.length ? null : exactAtomic(fees.length % 2 ? fees[middle] : fees[middle - 1] + fees[middle], fees.length % 2 ? 1n : 2n);
  const mean = exactAtomic(sum, BigInt(fees.length));
  return {
    fees: { count: fees.length, sum: sum.toString(), min: fees[0]?.toString() ?? null, median: median?.value ?? null, mean: mean?.value ?? null, max: fees.length ? fees[fees.length - 1].toString() : null, medianExact: median ? { remainder: median.remainder, denominator: median.denominator } : null, meanExact: mean ? { remainder: mean.remainder, denominator: mean.denominator } : null },
    phaseFees: { compute: { count: phase.compute.count, sum: phase.compute.count ? phase.compute.sum.toString() : null }, storage: { count: phase.storage.count, sum: phase.storage.count ? phase.storage.sum.toString() : null }, action: { count: phase.action.count, sum: phase.action.count ? phase.action.sum.toString() : null } },
    messages, status, categories, source: { ...source, returned: transactions?.length || 0 },
  };
}
