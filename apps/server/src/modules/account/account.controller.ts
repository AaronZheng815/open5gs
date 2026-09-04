import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountService } from './account.service';
import type { AccountDoc } from '../../db/account.schema';

@ApiTags('account')
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get()
  @ApiOperation({ summary: '列表：accounts' })
  list(): Promise<AccountDoc[]> {
    return this.service.list();
  }

  @Get(':username')
  get(@Param('username') username: string): Promise<AccountDoc> {
    return this.service.get(username);
  }

  @Post()
  @HttpCode(200)
  create(@Body() body: AccountDoc): Promise<AccountDoc> {
    return this.service.create(body);
  }

  @Put(':username')
  update(@Param('username') username: string, @Body() body: Partial<AccountDoc>): Promise<AccountDoc> {
    return this.service.update(username, body);
  }

  @Delete(':username')
  @HttpCode(200)
  delete(@Param('username') username: string): Promise<void> {
    return this.service.delete(username);
  }
}
