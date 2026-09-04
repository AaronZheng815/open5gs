/**
 * 记录级 CRUD 的行类型（T-18）。
 * 复用后端 open5gs.subscribers / profiles / accounts 集合的文档形状；
 * 子集合（slice/session/pcc_rule）相对后端 schema 是「自由 JSON」，故用 unknown 承载，
 * 由前端 JSON 子编辑器读写，不在 TS 层强约束。
 */

export interface DocSecurity {
  k?: string;
  op?: string;
  opc?: string;
  amf?: string;
  rand?: string;
  sqn?: number;
}

export interface DocAmbr {
  downlink?: { value?: number; unit?: number };
  uplink?: { value?: number; unit?: number };
}

export interface SubscriberRow {
  imsi: string;
  msisdn?: string[];
  imeisv?: string[];
  purge_flag?: boolean[];
  security?: DocSecurity;
  ambr?: DocAmbr;
  slice?: unknown[];
  access_restriction_data?: number;
  subscriber_status?: number;
  operator_determined_barring?: number;
  network_access_mode?: number;
  subscribed_rau_tau_timer?: number;
  [key: string]: unknown;
}

export interface ProfileRow {
  title: string;
  msisdn?: string[];
  imeisv?: string[];
  security?: DocSecurity;
  ambr?: DocAmbr;
  slice?: unknown[];
  subscriber_status?: number;
  operator_determined_barring?: number;
  [key: string]: unknown;
}

export interface AccountRow {
  username: string;
  salt?: string;
  hash?: string;
  roles?: string[];
  [key: string]: unknown;
}
