import { SubscriberSchema } from './subscriber.schema';
import { ProfileSchema } from './profile.schema';
import { AccountSchema } from './account.schema';
import { AuditLogSchema } from './audit-log.schema';
import { LifecycleTaskSchema } from './lifecycle-task.schema';

type IndexEntry = [Record<string, unknown>, { name?: string; [key: string]: unknown }];

describe('T-4 数据层 schema（复用现有集合，schema 不变 F-8）', () => {
  it('subscribers 保留 imsi 唯一必填 + 关键字段', () => {
    const imsi = SubscriberSchema.path('imsi')?.options;
    expect(imsi?.unique).toBe(true);
    expect(imsi?.required).toBe(true);
    expect(SubscriberSchema.path('security.sqn')).toBeTruthy();
    expect(SubscriberSchema.path('subscriber_status')?.options.default).toBe(0);
    expect(SubscriberSchema.path('slice')).toBeTruthy();
    expect(SubscriberSchema.path('slice.0.session')).toBeTruthy();
  });

  it('subscribers 使用 $type typeKey，collection 为 subscribers', () => {
    expect(SubscriberSchema.options.typeKey).toBe('$type');
    expect(String(SubscriberSchema.options.collection).toLowerCase()).toBe('subscribers');
  });

  it('profiles 保留 title 唯一必填（profile 基准用 title 而非 imsi）', () => {
    const title = ProfileSchema.path('title')?.options;
    expect(title?.unique).toBe(true);
    expect(title?.required).toBe(true);
    expect(ProfileSchema.options.typeKey).toBe('$type');
    expect(String(ProfileSchema.options.collection).toLowerCase()).toBe('profiles');
  });

  it('accounts 保留 username 唯一 + roles 数组', () => {
    const username = AccountSchema.path('username')?.options;
    expect(username?.unique).toBe(true);
    expect(AccountSchema.path('roles')).toBeTruthy();
    expect(String(AccountSchema.options.collection).toLowerCase()).toBe('accounts');
  });

  it('audit_logs 存在 (actor, ts) 索引', () => {
    const found = (AuditLogSchema.indexes() as IndexEntry[]).find(
      ([spec]) => spec.actor === 1 && spec.ts === -1,
    );
    expect(found).toBeTruthy();
    expect(String(AuditLogSchema.options.collection).toLowerCase()).toBe('audit_logs');
  });

  it('lifecycle_tasks 存在 (nfId, createdAt) 索引', () => {
    const found = (LifecycleTaskSchema.indexes() as IndexEntry[]).find(
      ([spec]) => spec.nfId === 1 && spec.createdAt === -1,
    );
    expect(found).toBeTruthy();
    expect(String(LifecycleTaskSchema.options.collection).toLowerCase()).toBe('lifecycle_tasks');
  });
});
