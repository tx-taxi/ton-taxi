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
// Keep provider values intact. Only known action types and field keys are translated.
const spanishActionNames: Record<string, string> = {
  TonTransfer: 'Transferencia de GRAM', JettonTransfer: 'Transferencia de jettons',
  JettonSwap: 'Intercambio de jettons', JettonMint: 'Emisión de jettons', JettonBurn: 'Quema de jettons',
  NftItemTransfer: 'Transferencia de NFT', NftPurchase: 'Compra de NFT',
  ExtraCurrencyTransfer: 'Transferencia de moneda adicional', SmartContractExec: 'Ejecución de contrato inteligente',
  DepositStake: 'Depósito de participación', WithdrawStake: 'Retiro de participación',
  WithdrawStakeRequest: 'Solicitud de retiro de participación', ElectionsDepositStake: 'Depósito de participación en elecciones',
  ElectionsRecoverStake: 'Recuperación de participación en elecciones', Subscription: 'Suscripción',
  UnSubscription: 'Cancelación de suscripción', AuctionBid: 'Puja en subasta', GasRelay: 'Retransmisión de gas',
};
const spanishActionFields: Record<string, string> = {
  amount: 'cantidad', ton_attached: 'cantidad adjunta', gram_attached: 'cantidad adjunta',
  sender: 'remitente', recipient: 'destinatario', source: 'origen', destination: 'destino',
  account: 'cuenta', wallet: 'cartera', address: 'dirección', contract: 'contrato',
  fee: 'comisión', refund: 'reembolso', cost: 'coste', value: 'valor',
  price: 'precio', currency: 'moneda', jetton: 'jetton', nft: 'NFT',
  buyer: 'comprador', seller: 'vendedor', auction: 'subasta', bid: 'puja',
  pool: 'grupo', comment: 'comentario', payload: 'carga útil',
};
const frenchActionNames: Record<string, string> = {
  TonTransfer: 'Transfert de GRAM', JettonTransfer: 'Transfert de jettons', JettonSwap: 'Échange de jettons',
  JettonMint: 'Émission de jettons', JettonBurn: 'Destruction de jettons', NftItemTransfer: 'Transfert de NFT',
  NftPurchase: 'Achat de NFT', ExtraCurrencyTransfer: 'Transfert de devise supplémentaire',
  SmartContractExec: 'Exécution de contrat intelligent', DepositStake: 'Dépôt de participation',
  WithdrawStake: 'Retrait de participation', WithdrawStakeRequest: 'Demande de retrait de participation',
  ElectionsDepositStake: 'Dépôt de participation aux élections', ElectionsRecoverStake: 'Récupération de participation aux élections',
  Subscription: 'Abonnement', UnSubscription: 'Résiliation d’abonnement', AuctionBid: 'Enchère', GasRelay: 'Relais de gas',
};
const germanActionNames: Record<string, string> = {
  TonTransfer: 'GRAM-Übertragung', JettonTransfer: 'Jetton-Übertragung', JettonSwap: 'Jetton-Tausch',
  JettonMint: 'Jetton-Ausgabe', JettonBurn: 'Jetton-Vernichtung', NftItemTransfer: 'NFT-Übertragung',
  NftPurchase: 'NFT-Kauf', ExtraCurrencyTransfer: 'Übertragung einer zusätzlichen Währung',
  SmartContractExec: 'Smart-Contract-Ausführung', DepositStake: 'Stake-Einzahlung', WithdrawStake: 'Stake-Auszahlung',
  WithdrawStakeRequest: 'Stake-Auszahlungsanfrage', ElectionsDepositStake: 'Stake-Einzahlung für Wahlen',
  ElectionsRecoverStake: 'Stake-Rückgewinnung aus Wahlen', Subscription: 'Abonnement', UnSubscription: 'Abonnementkündigung',
  AuctionBid: 'Auktionsgebot', GasRelay: 'Gas-Weiterleitung',
};
const portugueseActionNames: Record<string, string> = {
  TonTransfer: 'Transferência de GRAM', JettonTransfer: 'Transferência de jettons', JettonSwap: 'Troca de jettons',
  JettonMint: 'Emissão de jettons', JettonBurn: 'Queima de jettons', NftItemTransfer: 'Transferência de NFT',
  NftPurchase: 'Compra de NFT', ExtraCurrencyTransfer: 'Transferência de moeda adicional',
  SmartContractExec: 'Execução de contrato inteligente', DepositStake: 'Depósito de participação', WithdrawStake: 'Retirada de participação',
  WithdrawStakeRequest: 'Solicitação de retirada de participação', ElectionsDepositStake: 'Depósito de participação em eleições',
  ElectionsRecoverStake: 'Recuperação de participação em eleições', Subscription: 'Assinatura', UnSubscription: 'Cancelamento de assinatura',
  AuctionBid: 'Lance em leilão', GasRelay: 'Retransmissão de gas',
};
const frenchActionFields: Record<string, string> = {
  amount: 'montant', ton_attached: 'montant joint', gram_attached: 'montant joint', sender: 'expéditeur',
  recipient: 'destinataire', source: 'source', destination: 'destination', account: 'compte', wallet: 'portefeuille',
  address: 'adresse', contract: 'contrat', fee: 'frais', refund: 'remboursement', cost: 'coût', value: 'valeur',
  price: 'prix', currency: 'devise', jetton: 'jetton', nft: 'NFT', buyer: 'acheteur', seller: 'vendeur',
  auction: 'enchère', bid: 'offre', pool: 'pool', comment: 'commentaire', payload: 'charge utile',
};
const germanActionFields: Record<string, string> = {
  amount: 'Betrag', ton_attached: 'angehängter Betrag', gram_attached: 'angehängter Betrag', sender: 'Absender',
  recipient: 'Empfänger', source: 'Quelle', destination: 'Ziel', account: 'Konto', wallet: 'Wallet',
  address: 'Adresse', contract: 'Vertrag', fee: 'Gebühr', refund: 'Rückerstattung', cost: 'Kosten', value: 'Wert',
  price: 'Preis', currency: 'Währung', jetton: 'Jetton', nft: 'NFT', buyer: 'Käufer', seller: 'Verkäufer',
  auction: 'Auktion', bid: 'Gebot', pool: 'Pool', comment: 'Kommentar', payload: 'Nutzdaten',
};
const portugueseActionFields: Record<string, string> = {
  amount: 'quantia', ton_attached: 'quantia anexada', gram_attached: 'quantia anexada', sender: 'remetente',
  recipient: 'destinatário', source: 'origem', destination: 'destino', account: 'conta', wallet: 'carteira',
  address: 'endereço', contract: 'contrato', fee: 'taxa', refund: 'reembolso', cost: 'custo', value: 'valor',
  price: 'preço', currency: 'moeda', jetton: 'jetton', nft: 'NFT', buyer: 'comprador', seller: 'vendedor',
  auction: 'leilão', bid: 'lance', pool: 'pool', comment: 'comentário', payload: 'carga útil',
};
const italianActionNames: Record<string, string> = {
  TonTransfer: 'Trasferimento GRAM', JettonTransfer: 'Trasferimento di jetton', JettonSwap: 'Scambio di jetton',
  JettonMint: 'Emissione di jetton', JettonBurn: 'Distruzione di jetton', NftItemTransfer: 'Trasferimento NFT',
  NftPurchase: 'Acquisto NFT', ExtraCurrencyTransfer: 'Trasferimento di valuta aggiuntiva', SmartContractExec: 'Esecuzione di smart contract',
  DepositStake: 'Deposito di stake', WithdrawStake: 'Prelievo di stake', WithdrawStakeRequest: 'Richiesta di prelievo di stake',
  ElectionsDepositStake: 'Deposito di stake per le elezioni', ElectionsRecoverStake: 'Recupero di stake dalle elezioni',
  Subscription: 'Abbonamento', UnSubscription: 'Annullamento abbonamento', AuctionBid: 'Offerta all’asta', GasRelay: 'Inoltro gas',
};
const italianActionFields: Record<string, string> = {
  amount: 'importo', ton_attached: 'importo allegato', gram_attached: 'importo allegato', sender: 'mittente',
  recipient: 'destinatario', source: 'origine', destination: 'destinazione', account: 'account', wallet: 'portafoglio',
  address: 'indirizzo', contract: 'contratto', fee: 'commissione', refund: 'rimborso', cost: 'costo', value: 'valore',
  price: 'prezzo', currency: 'valuta', jetton: 'jetton', nft: 'NFT', buyer: 'acquirente', seller: 'venditore',
  auction: 'asta', bid: 'offerta', pool: 'pool', comment: 'commento', payload: 'dati',
};
const russianActionNames: Record<string, string> = {
  TonTransfer: 'Перевод GRAM', JettonTransfer: 'Перевод джеттонов', JettonSwap: 'Обмен джеттонов',
  JettonMint: 'Выпуск джеттонов', JettonBurn: 'Сжигание джеттонов', NftItemTransfer: 'Перевод NFT',
  NftPurchase: 'Покупка NFT', ExtraCurrencyTransfer: 'Перевод дополнительной валюты',
  SmartContractExec: 'Выполнение смарт-контракта', DepositStake: 'Внесение стейка', WithdrawStake: 'Вывод стейка',
  WithdrawStakeRequest: 'Запрос на вывод стейка', ElectionsDepositStake: 'Внесение стейка для выборов',
  ElectionsRecoverStake: 'Возврат стейка после выборов', Subscription: 'Подписка', UnSubscription: 'Отмена подписки',
  AuctionBid: 'Ставка на аукционе', GasRelay: 'Передача газа',
};
const russianActionFields: Record<string, string> = {
  amount: 'сумма', ton_attached: 'прикреплённая сумма', gram_attached: 'прикреплённая сумма', sender: 'отправитель',
  recipient: 'получатель', source: 'источник', destination: 'назначение', account: 'аккаунт', wallet: 'кошелёк',
  address: 'адрес', contract: 'контракт', fee: 'комиссия', refund: 'возврат', cost: 'стоимость', value: 'значение',
  price: 'цена', currency: 'валюта', jetton: 'джеттон', nft: 'NFT', buyer: 'покупатель', seller: 'продавец',
  auction: 'аукцион', bid: 'ставка', pool: 'пул', comment: 'комментарий', payload: 'полезная нагрузка',
};
const ukrainianActionNames: Record<string, string> = {
  TonTransfer: 'Переказ GRAM', JettonTransfer: 'Переказ джетонів', JettonSwap: 'Обмін джетонів',
  JettonMint: 'Випуск джетонів', JettonBurn: 'Спалювання джетонів', NftItemTransfer: 'Переказ NFT',
  NftPurchase: 'Купівля NFT', ExtraCurrencyTransfer: 'Переказ додаткової валюти', SmartContractExec: 'Виконання смартконтракту',
  DepositStake: 'Внесення стейку', WithdrawStake: 'Виведення стейку', WithdrawStakeRequest: 'Запит на виведення стейку',
  ElectionsDepositStake: 'Внесення стейку для виборів', ElectionsRecoverStake: 'Повернення стейку після виборів',
  Subscription: 'Підписка', UnSubscription: 'Скасування підписки', AuctionBid: 'Ставка на аукціоні', GasRelay: 'Передача газу',
};
const ukrainianActionFields: Record<string, string> = {
  amount: 'сума', ton_attached: 'додана сума', gram_attached: 'додана сума', sender: 'відправник', recipient: 'одержувач',
  source: 'джерело', destination: 'призначення', account: 'акаунт', wallet: 'гаманець', address: 'адреса', contract: 'контракт',
  fee: 'комісія', refund: 'повернення', cost: 'вартість', value: 'значення', price: 'ціна', currency: 'валюта', jetton: 'джетон',
  nft: 'NFT', buyer: 'покупець', seller: 'продавець', auction: 'аукціон', bid: 'ставка', pool: 'пул', comment: 'коментар', payload: 'корисне навантаження',
};
const dutchActionNames: Record<string, string> = {
  TonTransfer: 'GRAM-overdracht', JettonTransfer: 'Jettonoverdracht', JettonSwap: 'Jettonruil',
  JettonMint: 'Jettonuitgifte', JettonBurn: 'Jettonvernietiging', NftItemTransfer: 'NFT-overdracht',
  NftPurchase: 'NFT-aankoop', ExtraCurrencyTransfer: 'Overdracht van aanvullende valuta', SmartContractExec: 'Uitvoering van smart contract',
  DepositStake: 'Stake storten', WithdrawStake: 'Stake opnemen', WithdrawStakeRequest: 'Aanvraag voor opname van stake',
  ElectionsDepositStake: 'Stake storten voor verkiezingen', ElectionsRecoverStake: 'Stake terughalen na verkiezingen',
  Subscription: 'Abonnement', UnSubscription: 'Abonnement opzeggen', AuctionBid: 'Veilingbod', GasRelay: 'Gasdoorvoer',
};
const dutchActionFields: Record<string, string> = {
  amount: 'bedrag', ton_attached: 'meegestuurd bedrag', gram_attached: 'meegestuurd bedrag', sender: 'afzender', recipient: 'ontvanger',
  source: 'bron', destination: 'bestemming', account: 'account', wallet: 'wallet', address: 'adres', contract: 'contract',
  fee: 'kosten', refund: 'terugbetaling', cost: 'kosten', value: 'waarde', price: 'prijs', currency: 'valuta', jetton: 'jetton',
  nft: 'NFT', buyer: 'koper', seller: 'verkoper', auction: 'veiling', bid: 'bod', pool: 'pool', comment: 'opmerking', payload: 'payload',
};
function language(locale: string): string { return locale.toLowerCase().split('-')[0]; }
const localizedActionNames: Record<string, Record<string, string>> = {es: spanishActionNames, fr: frenchActionNames, de: germanActionNames, pt: portugueseActionNames, it: italianActionNames, ru: russianActionNames, uk: ukrainianActionNames, nl: dutchActionNames};
const localizedActionFields: Record<string, Record<string, string>> = {es: spanishActionFields, fr: frenchActionFields, de: germanActionFields, pt: portugueseActionFields, it: italianActionFields, ru: russianActionFields, uk: ukrainianActionFields, nl: dutchActionFields};
const localizedRawUnits: Record<string, string> = {es: 'unidades sin procesar', fr: 'unités brutes', de: 'Roheinheiten', pt: 'unidades brutas', it: 'unità grezze', ru: 'исходные единицы', uk: 'необроблені одиниці', nl: 'ruwe eenheden'};
function actionNames(locale: string): Record<string, string> | undefined { return localizedActionNames[language(locale)]; }
function actionFields(locale: string): Record<string, string> | undefined { return localizedActionFields[language(locale)]; }
export function actionFieldLabel(key: string, locale = 'en', fallback?: string): string {
  const fields = actionFields(locale);
  if (fields && Object.prototype.hasOwnProperty.call(fields, key)) return fields[key];
  return fallback || readableField(key).replace(/^(ton|gram) attached$/, 'Amount attached');
}
export function actionTitle(action: any, locale = 'en', fallback?: string): string {
  const names = actionNames(locale);
  if (names && Object.prototype.hasOwnProperty.call(names, action?.type)) return names[action.type];
  if (fallback !== undefined) return fallback;
  return readableField(({NftItemTransfer: 'NFT transfer', NftPurchase: 'NFT purchase', TonTransfer: 'GRAM transfer'} as Record<string, string>)[action.type] || action.type || 'Action');
}
export interface TonActionField { label: string; text?: string; route?: string[]; identity?: NativeIdentity; amount?: ReturnType<typeof tonAmount>; flagged?: boolean; }
export function tonActionFields(action: any, locale = 'en'): TonActionField[] {
  const payload = action?.[action.type] || {};
  return Object.entries<any>(payload).flatMap(([key, value]): TonActionField[] => {
    if (value == null || key === 'ton_attached' && payload.gram_attached != null || key === 'amount' && payload.stake_meta) return [];
    const label = actionFieldLabel(key, locale);
    const rawUnits = localizedRawUnits[language(locale)] || 'raw units';
    if (key === 'currency' && value.id != null) return [{label, text: value.symbol || String(value.id), route: ['/extra-currency', String(value.id)]}];
    if (value.address) return [{label, text: value.name || value.symbol || value.address, identity: {...tonIdentity(value), tokenSymbol: value.symbol}, route: [key.includes('jetton') ? '/jetton' : key.includes('nft') ? '/nft' : '/address', value.address], flagged: value.is_scam || value.verification === 'blacklist'}];
    if (typeof value === 'string' && /^(?:-?\d:[a-fA-F0-9]{64}|[A-Za-z0-9_-]{48})$/.test(value)) return [{label, text: value, identity: tonIdentity(value), route: [key.includes('nft') ? '/nft' : '/address', value]}];
    if (value.currency_type && value.value != null) {
      const native = value.currency_type === 'native';
      const decimals = native ? 9 : value.decimals;
      return [{label, amount: decimals == null ? null : tonAmount(value.value, decimals, native ? 'GRAM' : value.token_name || 'tokens', native), text: `${value.value}${decimals == null ? ' ' + rawUnits : ''}`}];
    }
    if (['amount', 'ton_attached', 'gram_attached', 'fee', 'refund', 'cost', 'value'].includes(key) && /^-?\d+$/.test(String(value))) {
      const native = /^(TonTransfer|DepositStake|WithdrawStake|WithdrawStakeRequest|ElectionsDepositStake|ElectionsRecoverStake|SmartContractExec|Subscription|UnSubscription|AuctionBid|GasRelay)$/.test(action.type);
      const token = action.type === 'ExtraCurrencyTransfer' ? payload.currency : payload.jetton;
      const amount = token?.decimals != null ? tonAmount(value, token.decimals, token.symbol || 'tokens', false) : native ? tonAmount(value) : null;
      return [{label, amount, text: token && token.decimals == null ? `${value} ${rawUnits}` : String(value)}];
    }
    return [{label, text: typeof value === 'object' ? JSON.stringify(publicDetails(value)) : String(value)}];
  });
}
