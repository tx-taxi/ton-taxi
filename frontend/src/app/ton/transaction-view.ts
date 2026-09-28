import { NativeAmount, NativeIdentity } from '../shared/native-view.types';

/** Native TON transaction inputs. Integer quantities stay decimal strings. */
export interface TonIdentity { address: string; name?: string; is_scam?: boolean; }
export interface TonMessage {
  hash?: string;
  msg_type?: string;
  source?: TonIdentity | string | null;
  destination?: TonIdentity | string | null;
  value?: string;
  value_extra?: Array<{id?: string; amount?: string; value?: string; preview?: {id?: string; symbol?: string; decimals?: number}}>;
  bounced?: boolean;
  bounce?: boolean;
  decoded_op_name?: string;
  op_code?: string;
  [key: string]: unknown;
}
export interface TonTransaction {
  hash: string;
  account?: TonIdentity | string;
  success?: boolean;
  utime?: number | string;
  total_fees?: string;
  block?: string;
  master_seqno?: number | string;
  lt?: string;
  orig_status?: string;
  end_status?: string;
  end_balance?: string;
  in_msg?: TonMessage;
  out_msgs?: TonMessage[];
  [key: string]: any;
}
export interface TonEvent { event_id?: string; timestamp?: number; in_progress?: boolean; is_scam?: boolean; actions?: any[]; [key: string]: any; }
export interface TonTrace { transaction?: TonTransaction; children?: TonTrace[]; [key: string]: any; }

export function tonAddress(value: TonIdentity | string | null | undefined): string {
  return typeof value === 'string' ? value : value?.address || '';
}
export function tonLabel(value: TonIdentity | string | null | undefined): string {
  return typeof value === 'string' ? value : value?.name || value?.address || '';
}
export function tonIdentity(value: TonIdentity | string | null | undefined): NativeIdentity {
  return { address: tonAddress(value), name: typeof value === 'object' ? value?.name : null, isScam: typeof value === 'object' && value?.is_scam === true };
}
export function tonAmount(value: unknown, decimals: number | string = 9, symbol = 'GRAM', native = true): NativeAmount | null {
  const atomic = typeof value === 'string' ? value : typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : '';
  const precision = Number(decimals);
  if (!/^-?\d+$/.test(atomic) || !Number.isInteger(precision) || precision < 0 || precision > 255) return null;
  return { atomic, decimals: precision, symbol, atomicSymbol: native ? 'nanograms' : 'raw units', native };
}
export function tonExecution(tx: TonTransaction): string {
  return tx.success === true ? 'Successful' : tx.success === false ? 'Failed' : 'Unknown';
}
export function tonMessages(tx: TonTransaction): Array<TonMessage & {direction: 'Incoming' | 'Outgoing'}> {
  return [...(tx.in_msg ? [{...tx.in_msg, direction: 'Incoming' as const}] : []), ...(tx.out_msgs || []).map(message => ({...message, direction: 'Outgoing' as const}))];
}
/** Trace responses can omit outputs that are present as child incoming messages. */
export function transactionWithTraceMessages(transaction: TonTransaction, trace?: TonTrace): TonTransaction {
  if (!trace || !transaction?.hash) return transaction;
  const find = (node: TonTrace): TonTrace | null => {
    if (node.transaction?.hash === transaction.hash) return node;
    for (const child of node.children || []) { const found = find(child); if (found) return found; }
    return null;
  };
  const node = find(trace);
  const account = tonAddress(transaction.account);
  if (!node || !account) return transaction;
  const outputs = [...(transaction.out_msgs || [])];
  const hashes = new Set(outputs.map(message => message.hash).filter(Boolean));
  for (const child of node.children || []) {
    const message = child.transaction?.in_msg;
    if (message?.hash && tonAddress(message.source) === account && !hashes.has(message.hash)) { outputs.push(message); hashes.add(message.hash); }
  }
  return outputs.length > (transaction.out_msgs || []).length ? {...transaction, out_msgs: outputs} : transaction;
}
export function publicDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicDetails);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('_')).map(([key, child]) => [key, publicDetails(child)]));
  return value;
}
export function readableField(key: string): string { return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'); }
export function actionTitle(action: any): string {
  return readableField(({NftItemTransfer: 'NFT transfer', NftPurchase: 'NFT purchase', TonTransfer: 'GRAM transfer'} as Record<string, string>)[action.type] || action.type || 'Action');
}
export interface TonActionField { label: string; text?: string; route?: string[]; identity?: NativeIdentity; amount?: ReturnType<typeof tonAmount>; flagged?: boolean; }
export function tonActionFields(action: any): TonActionField[] {
  const payload = action?.[action.type] || {};
  return Object.entries<any>(payload).flatMap(([key, value]): TonActionField[] => {
    if (value == null || key === 'ton_attached' && payload.gram_attached != null || key === 'amount' && payload.stake_meta) return [];
    const label = readableField(key).replace(/^(ton|gram) attached$/, 'Amount attached');
    if (key === 'currency' && value.id != null) return [{label, text: value.symbol || String(value.id), route: ['/extra-currency', String(value.id)]}];
    if (value.address) return [{label, text: value.name || value.symbol || value.address, identity: {...tonIdentity(value), tokenSymbol: value.symbol}, route: [key.includes('jetton') ? '/jetton' : key.includes('nft') ? '/nft' : '/address', value.address], flagged: value.is_scam || value.verification === 'blacklist'}];
    if (typeof value === 'string' && /^(?:-?\d:[a-fA-F0-9]{64}|[A-Za-z0-9_-]{48})$/.test(value)) return [{label, text: value, identity: tonIdentity(value), route: [key.includes('nft') ? '/nft' : '/address', value]}];
    if (value.currency_type && value.value != null) {
      const native = value.currency_type === 'native';
      const decimals = native ? 9 : value.decimals;
      return [{label, amount: decimals == null ? null : tonAmount(value.value, decimals, native ? 'GRAM' : value.token_name || 'tokens', native), text: `${value.value}${decimals == null ? ' raw units' : ''}`}];
    }
    if (['amount', 'ton_attached', 'gram_attached', 'fee', 'refund', 'cost', 'value'].includes(key) && /^-?\d+$/.test(String(value))) {
      const native = /^(TonTransfer|DepositStake|WithdrawStake|WithdrawStakeRequest|ElectionsDepositStake|ElectionsRecoverStake|SmartContractExec|Subscription|UnSubscription|AuctionBid|GasRelay)$/.test(action.type);
      const token = action.type === 'ExtraCurrencyTransfer' ? payload.currency : payload.jetton;
      const amount = token?.decimals != null ? tonAmount(value, token.decimals, token.symbol || 'tokens', false) : native ? tonAmount(value) : null;
      return [{label, amount, text: token && token.decimals == null ? `${value} raw units` : String(value)}];
    }
    return [{label, text: typeof value === 'object' ? JSON.stringify(publicDetails(value)) : String(value)}];
  });
}
