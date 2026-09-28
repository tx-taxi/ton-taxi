export type PaymentMethod = 'balance' | 'bitcoin' | 'cashapp' | 'applePay' | 'googlePay' | 'cardOnFile';

export type AccelerationEstimate = {
  hasAccess: boolean;
  txSummary: TxSummary;
  nextBlockFee: number;
  targetFeeRate: number;
  userBalance: number;
  enoughBalance: boolean;
  cost: number;
  mempoolBaseFee: number;
  vsizeFee: number;
  pools: number[];
  availablePaymentMethods: Record<PaymentMethod, {min: number, max: number, card?: {card_id: string, last_4: string, brand: string, name: string, billing: any}}>;
  unavailable?: boolean;
  options: { // recommended bid options
    fee: number; // recommended userBid in sats
  }[];
}
export type TxSummary = {
  txid: string; // txid of the current transaction
  effectiveVsize: number; // Total vsize of the dependency tree
  effectiveFee: number;  // Total fee of the dependency tree in sats
  ancestorCount: number; // Number of ancestors
}

export interface RateOption {
  fee: number;
  rate: number;
  index: number;
}

