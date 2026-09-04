import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { SubscriberService } from './subscriber.service';
import { SubscriberController } from './subscriber.controller';

@Module({
  imports: [DbModule],
  controllers: [SubscriberController],
  providers: [SubscriberService],
  exports: [SubscriberService],
})
export class SubscriberModule {}
