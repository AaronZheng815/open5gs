import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ConfigDiff, ConfigDoc, ConfigPatch } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from './config.service';

@ApiTags('config')
@UseGuards(JwtAuthGuard)
@Controller('nfs/:id/config')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  @Get()
  @ApiOperation({ summary: '读取网元结构化配置（AC-2）' })
  read(@Param('id') id: string): ConfigDoc {
    return this.service.readConfig(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '应用配置：dry_run=true 仅 diff；false 落盘+备份（AC-3/AC-4）' })
  apply(@Param('id') id: string, @Body() patch: ConfigPatch, @Query('dry_run') dryRun?: string): ConfigDiff {
    return this.service.applyConfig(id, patch, dryRun === 'true' || dryRun === '1');
  }
}
