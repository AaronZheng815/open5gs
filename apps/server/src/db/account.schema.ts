import { Schema, model } from 'mongoose';

/**
 * 复用现有 open5gs.accounts 集合的 schema（F-8，字段/结构不变）。
 * 现有集合由 passport-local-mongoose 写库，默认字段为 username + salt + hash + roles；
 * 用 strict:false 以保留可能存在的 username_hash / username_hex 等扩展字段，避免回写时丢数据。
 * 口令校验/比对逻辑不在数据层实现（见 T-5 auth），此处仅承载 schema 与 CRUD。
 */
export const AccountSchema = new Schema(
  {
    username: { $type: String, unique: true, required: true },
    salt: { $type: String, required: false },
    hash: { $type: String, required: false },
    roles: { $type: [String], default: [] },
  },
  { typeKey: '$type', collection: 'accounts', strict: false },
);

export interface AccountDoc {
  username: string;
  salt?: string;
  hash?: string;
  roles?: string[];
  [key: string]: unknown;
}

export const AccountModel = model<AccountDoc>('Account', AccountSchema);
