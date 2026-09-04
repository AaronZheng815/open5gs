import { Schema, model } from 'mongoose';

/** 复用现有 open5gs.subscribers 集合的 schema（F-8，字段/结构不变，仅 sqn 用 Number 代替 mongoose-long 的 Long）。 */
export const SubscriberSchema = new Schema(
  {
    schema_version: { $type: Number, default: 1 },
    imsi: { $type: String, unique: true, required: true },
    msisdn: [String],
    imeisv: [String],
    mme_host: [String],
    mme_realm: [String],
    purge_flag: [Boolean],
    security: {
      k: String,
      op: String,
      opc: String,
      amf: String,
      rand: String,
      sqn: Number,
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
    access_restriction_data: { $type: Number, default: 32 },
    subscriber_status: { $type: Number, default: 0 },
    operator_determined_barring: { $type: Number, default: 0 },
    network_access_mode: { $type: Number, default: 0 },
    subscribed_rau_tau_timer: { $type: Number, default: 12 },
  },
  { typeKey: '$type', collection: 'subscribers', strict: false },
);

export interface SubscriberDoc {
  imsi: string;
  [key: string]: unknown;
}

export const SubscriberModel = model<SubscriberDoc>('Subscriber', SubscriberSchema);
