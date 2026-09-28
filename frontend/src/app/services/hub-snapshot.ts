import { readTonPending } from '@app/shared/ton-pending-state';
/** Conservative, one-shot warm strip hydration. Live websocket initialization remains authoritative. */
export function readHubSnapshot(value: unknown, chainId: string, now = Date.now()): any | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const envelope = value as any;
    if (envelope.version !== 1 || envelope.chainId !== chainId || !Number.isFinite(envelope.capturedAt)
      || now - envelope.capturedAt < 0 || now - envelope.capturedAt > 30000) return null;
    if (new TextEncoder().encode(JSON.stringify(envelope)).byteLength > 262144) return null;
    const snapshot = envelope.snapshot;
    const nonnegative = (n: unknown): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    const fees = (a: unknown): boolean => Array.isArray(a) && a.length >= 1 && a.length <= 128 && a.every(nonnegative);
    if (!snapshot || !Array.isArray(snapshot.blocks) || snapshot.blocks.length < 1 || snapshot.blocks.length > 8
      || !Array.isArray(snapshot.mempoolBlocks) || snapshot.mempoolBlocks.length > 8) return null;
    if (chainId === 'ton') {
      if (snapshot.mempoolBlocks.length !== 0) return null;
      for (let i = 0; i < snapshot.blocks.length; i++) {
        const block = snapshot.blocks[i];
        const id = typeof block?.id === 'string' && block.id.match(/^\(-1,8000000000000000,(\d+)\)$/);
        if (!id || !Number.isSafeInteger(block.height) || block.height < 0 || String(block.height) !== id[1]
          || !Number.isSafeInteger(block.timestamp) || block.timestamp <= 0
          || !Number.isSafeInteger(block.tx_count) || block.tx_count < 0
          || block.size !== 0 || block.weight !== 0
          || (i > 0 && block.height >= snapshot.blocks[i - 1].height)) return null;
        const extras = block.extras;
        if (!extras || !/^[0-9]{1,100}$/.test(extras.totalFees) || typeof extras.totalFees !== 'string'
          || extras.medianFee !== null || extras.minFee !== null || extras.maxFee !== null
          || !Array.isArray(extras.feeRange) || extras.feeRange.length !== 0) return null;
      }
      const result = structuredClone(snapshot);
      // Pending changes much faster than blocks; a handoff is retained as stale
      // until this explorer receives its own live source state.
      delete result.tonPending;
      const pending = readTonPending(snapshot.tonPending);
      if (pending) result.tonPending = {...pending, state: pending.observedAt ? 'stale' : 'loading'};
      return result;
    }
    for (let i = 0; i < snapshot.blocks.length; i++) {
      const block = snapshot.blocks[i];
      if (!block || typeof block.id !== 'string' || !/^(?:0x)?[a-f0-9]{64}$/i.test(block.id)
        || !Number.isSafeInteger(block.height) || block.height < 0
        || !Number.isSafeInteger(block.timestamp) || block.timestamp <= 0
        || !Number.isSafeInteger(block.tx_count) || block.tx_count < 0
        || !nonnegative(block.size) || !nonnegative(block.weight)
        || (i > 0 && block.height !== snapshot.blocks[i - 1].height - 1)) return null;
      if (block.extras && (!nonnegative(block.extras.medianFee) || !nonnegative(block.extras.totalFees)
        || !fees(block.extras.feeRange))) return null;
    }
    if (!snapshot.mempoolBlocks.every((block: any) => block && nonnegative(block.blockSize)
      && nonnegative(block.blockVSize) && Number.isSafeInteger(block.nTx) && block.nTx >= 0
      && nonnegative(block.totalFees) && nonnegative(block.medianFee) && fees(block.feeRange))) return null;
    if (snapshot.difficultyAdjustment !== undefined && (!snapshot.difficultyAdjustment
      || !nonnegative(snapshot.difficultyAdjustment.adjustedTimeAvg)
      || !Number.isFinite(snapshot.difficultyAdjustment.timeOffset))) return null;
    return structuredClone(snapshot);
  } catch { return null; }
}
