import { Schema, model } from 'mongoose';

/** 复用现有 open5gs.profiles 集合的 schema（F-8，字段/结构不变）。 */
export const ProfileSchema = new Schema(
  {
    schema_version: { $type: Number, default: 1 },
    title: { $type: String, unique: true, required: true },
    msisdn: [String],
    imeisv: [String],
    security: {
      k: String,
      op: String,
      opc: String,
      amf: String,
    },
    ambr: {
      downlink: { value: Number, unit: Number },
      uplink: { value: Number, unit: Number },
    },
    slice: [
      {
        sst: { $type: Number, required: true },
        sd: String,
        default_indicator: Boolean,
        session: [
          {
            name: { $type: String, required: true },
            type: Number,
            qos: {
              index: Number,
              arp: {
                priority_level: Number,
                pre_emption_capability: Number,
                pre_emption_vulnerability: Number,
              },
            },
            ambr: {
              downlink: { value: Number, unit: Number },
              uplink: { value: Number, unit: Number },
            },
            ue: { ipv4: String, ipv6: String },
            smf: { ipv4: String, ipv6: String },
            pcc_rule: [
              {
                flow: [{ direction: Number, description: String }],
                qos: {
                  index: Number,
                  arp: {
                    priority_level: Number,
                    pre_emption_capability: Number,
                    pre_emption_vulnerability: Number,
                  },
                  mbr: { downlink: { value: Number, unit: Number }, uplink: { value: Number, unit: Number } },
                  gbr: { downlink: { value: Number, unit: Number }, uplink: { value: Number, unit: Number } },
                },
              },
            ],
            lbo_roaming_allowed: Boolean,
          },
        ],
      },
    ],
    subscriber_status: { $type: Number, default: 0 },
    operator_determined_barring: { $type: Number, default: 0 },
  },
  { typeKey: '$type', collection: 'profiles', strict: false },
);

export interface ProfileDoc {
  title: string;
  [key: string]: unknown;
}

export const ProfileModel = model<ProfileDoc>('Profile', ProfileSchema);
