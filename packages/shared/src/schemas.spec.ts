import { describe, expect, it } from 'vitest';
import {
  AuditLogSchema,
  ConfigDiffSchema,
  LifecycleActionSchema,
  LifecycleTaskSchema,
  LoginRequestSchema,
  MetricSnapshotSchema,
  NfAssetSchema,
  TopologyGraphSchema,
} from './index';
import type { NfAsset } from './index';

/** 类型级断言：从 schema 推断出的类型可被赋值使用 */
const _typeCheck = (): NfAsset => ({
  id: 'amf',
  nfType: 'AMF',
  addr: '127.0.0.5',
  status: 'offline',
});

describe('shared zod schemas', () => {
  it('parses a valid NfAsset and infers type', () => {
    const a = NfAssetSchema.parse({ id: 'amf', nfType: 'AMF', addr: '127.0.0.5', status: 'online' });
    expect(a.status).toBe('online');
    expect(_typeCheck().nfType).toBe('AMF');
  });

  it('rejects invalid lifecycle action', () => {
    expect(LifecycleActionSchema.safeParse('reboot').success).toBe(false);
    expect(LifecycleActionSchema.safeParse('restart').success).toBe(true);
  });

  it('enforces dryRun as boolean', () => {
    expect(ConfigDiffSchema.safeParse({ id: 'x', dryRun: 'yes', diff: [] }).success).toBe(false);
    expect(ConfigDiffSchema.safeParse({ id: 'x', dryRun: true, diff: [] }).success).toBe(true);
  });

  it('requires username/password on login', () => {
    expect(LoginRequestSchema.safeParse({ username: 'u' }).success).toBe(false);
    expect(LoginRequestSchema.safeParse({ username: 'u', password: 'p' }).success).toBe(true);
  });

  it('parses topology graph nodes/edges', () => {
    const g = TopologyGraphSchema.parse({
      nodes: [{ id: 'nrf', label: 'NRF', nfType: 'NRF' }],
      edges: [{ source: 'nrf', target: 'amf' }],
    });
    expect(g.nodes).toHaveLength(1);
    expect(g.edges[0].label).toBeUndefined();
  });

  it('parses metric snapshot', () => {
    const s = MetricSnapshotSchema.parse({ nfId: 'amf', available: true, metrics: [{ name: 'x', value: 1 }] });
    expect(s.metrics[0].value).toBe(1);
  });

  it('parses audit log with datetime', () => {
    const a = AuditLogSchema.parse({
      actor: 'sder',
      action: 'restart',
      target: 'amf',
      result: 'ok',
      ts: new Date().toISOString(),
    });
    expect(a.actor).toBe('sder');
  });

  it('parses lifecycle task', () => {
    const t = LifecycleTaskSchema.parse({
      id: 't1',
      nfId: 'amf',
      action: 'restart',
      status: 'queued',
      by: 'sder',
      createdAt: new Date().toISOString(),
    });
    expect(t.status).toBe('queued');
  });
});
