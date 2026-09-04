import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [DbModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
