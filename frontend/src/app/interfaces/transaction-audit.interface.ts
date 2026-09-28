export interface Pool {
  id: number;
  name: string;
  slug: string;
  minerNames: string[] | null;
}

export interface TxAuditStatus {
  seen?: boolean;
  expected?: boolean;
  added?: boolean;
  prioritized?: boolean;
  delayed?: number;
  accelerated?: boolean;
  conflict?: boolean;
  coinbase?: boolean;
  firstSeen?: number;
}

