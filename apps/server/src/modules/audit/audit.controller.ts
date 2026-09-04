import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuditLogList, LifecycleTaskList } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

function pageOf(v?: string, fallback = 1): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pageSizeOf(v?: string): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

@ApiTags('audit')
@UseGuards(JwtAuthGuard)
@Controller()
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('audits')
  @ApiOperation({ summary: '审计日志列表（AC-12 查询）' })
  audits(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('actor') actor?: string,
  ): Promise<AuditLogList> {
    return this.service.listAudits(pageOf(page), pageSizeOf(pageSize), actor);
  }

  @Get('lifecycle-tasks')
  @ApiOperation({ summary: '生命周期任务列表（AC-12 查询）' })
  tasks(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('nfId') nfId?: string,
  ): Promise<LifecycleTaskList> {
    return this.service.listTasks(pageOf(page), pageSizeOf(pageSize), nfId);
  }
}
