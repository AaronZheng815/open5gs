import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriberService } from './subscriber.service';
import type { SubscriberDoc } from '../../db/subscriber.schema';

@ApiTags('subscriber')
@UseGuards(JwtAuthGuard)
@Controller('subscribers')
export class SubscriberController {
  constructor(private readonly service: SubscriberService) {}

  @Get()
  @ApiOperation({ summary: '列表：subscribers' })
  list(): Promise<SubscriberDoc[]> {
    return this.service.list();
  }

  @Get(':imsi')
  get(@Param('imsi') imsi: string): Promise<SubscriberDoc> {
    return this.service.get(imsi);
  }

  @Post()
  @HttpCode(200)
  create(@Body() body: SubscriberDoc): Promise<SubscriberDoc> {
    return this.service.create(body);
  }

  @Put(':imsi')
  update(@Param('imsi') imsi: string, @Body() body: Partial<SubscriberDoc>): Promise<SubscriberDoc> {
    return this.service.update(imsi, body);
  }

  @Delete(':imsi')
  @HttpCode(200)
  delete(@Param('imsi') imsi: string): Promise<void> {
    return this.service.delete(imsi);
  }
}
