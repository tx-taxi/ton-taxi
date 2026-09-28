import { TransactionStripped } from '@interfaces/node-api.interface';
import { TonPendingMessage } from '@app/shared/ton-pending.types';

export interface PendingGraphMessage extends TransactionStripped {
  layoutWeight: number;
  pendingMessage: TonPendingMessage;
}

/** BOC bytes size the existing scene; protocol fees and values remain unknown. */
export function pendingGraphMessages(messages: TonPendingMessage[]): PendingGraphMessage[] {
  const seen = new Set<string>();
  return messages.filter(message => {
    const key = message.normalizedHash + ':' + message.destination;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(message => ({
    txid: message.normalizedHash + ':' + message.destination,
    // Required scene fields only; the pending tooltip never presents these.
    fee: 0, value: 0, vsize: 1, flags: 0,
    time: Date.parse(message.firstSeenAt) / 1000,
    layoutWeight: Math.max(1, message.bocBytes),
    pendingMessage: message,
  }));
}

export function pendingGraphBlockLimit(messages: PendingGraphMessage[]): number {
  // Relative scene scale, not a network block capacity or fullness estimate.
  return Math.max(1, Math.ceil(messages.reduce((sum, message) => sum + message.layoutWeight, 0) / 0.72));
}
