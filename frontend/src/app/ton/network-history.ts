export interface TonHistoryObservation {
  seqno: string | number;
  timestamp: string | number;
  fees?: string | number | null;
}

export interface TonNetworkHistorySample {
  timestamp: number;
  gapBefore?: boolean;
  fees?: number | string | null;
  feeAtomic?: string;
  feeTotalAtomic?: string;
  feeCount?: number;
  blockCount?: number;
  firstSeqno?: number;
  lastSeqno?: number;
  interval?: number | string;
}

/** Block timestamps have whole-second precision; several real blocks can share one. */
export function tonNetworkHistory(observations: TonHistoryObservation[]): TonNetworkHistorySample[] {
  const samples: TonNetworkHistorySample[] = [];
  let previous: { sequence: number; timestamp: number } | undefined;
  let bucket: TonNetworkHistorySample | undefined;
  let anchor: { sequence: number; timestamp: number } | undefined;
  let total = 0n;
  for (const observation of observations) {
    const sequence = Number(observation.seqno), timestamp = Number(observation.timestamp);
    if (!Number.isSafeInteger(sequence) || sequence < 0 || !Number.isSafeInteger(timestamp) || timestamp < 0) continue;
    if (previous && sequence <= previous.sequence) continue;
    const gap = !!previous && (sequence !== previous.sequence + 1 || timestamp < previous.timestamp);
    if (!bucket || bucket.timestamp !== timestamp || gap) {
      anchor = gap ? undefined : previous;
      bucket = { timestamp, firstSeqno: sequence, lastSeqno: sequence, blockCount: 0, feeCount: 0, gapBefore: gap };
      samples.push(bucket);
      total = 0n;
    }
    bucket.lastSeqno = sequence;
    bucket.blockCount++;
    const rawFee = observation.fees == null ? '' : String(observation.fees);
    if (/^\d+$/.test(rawFee)) {
      total += BigInt(rawFee);
      bucket.feeCount++;
      bucket.feeTotalAtomic = total.toString();
      bucket.feeAtomic = (total / BigInt(bucket.feeCount)).toString();
      bucket.fees = Number(total) / bucket.feeCount / 1_000_000_000;
    }
    // Include all sequence intervals, including blocks with equal timestamps.
    // A missing-height boundary never contributes an inferred interval.
    const startSequence = anchor?.sequence ?? bucket.firstSeqno;
    const startTimestamp = anchor?.timestamp ?? bucket.timestamp;
    const distance = sequence - startSequence;
    bucket.interval = distance > 0 ? (timestamp - startTimestamp) / distance : undefined;
    previous = { sequence, timestamp };
  }
  return samples;
}
