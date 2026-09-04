import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriberSchema } from './subscriber.schema';
import { ProfileSchema } from './profile.schema';
import { AccountSchema } from './account.schema';
import { AuditLogSchema } from './audit-log.schema';
import { LifecycleTaskSchema } from './lifecycle-task.schema';
import { SubscriberRepository } from './subscriber.repository';
import { ProfileRepository } from './profile.repository';
import { AccountRepository } from './account.repository';
import { AuditLogRepository } from './audit-log.repository';
import { LifecycleTaskRepository } from './lifecycle-task.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Subscriber', schema: SubscriberSchema },
      { name: 'Profile', schema: ProfileSchema },
      { name: 'Account', schema: AccountSchema },
      { name: 'AuditLog', schema: AuditLogSchema },
      { name: 'LifecycleTask', schema: LifecycleTaskSchema },
    ]),
  ],
  providers: [
    SubscriberRepository,
    ProfileRepository,
    AccountRepository,
    AuditLogRepository,
    LifecycleTaskRepository,
  ],
  exports: [
    SubscriberRepository,
    ProfileRepository,
    AccountRepository,
    AuditLogRepository,
    LifecycleTaskRepository,
  ],
})
export class DbModule {}
