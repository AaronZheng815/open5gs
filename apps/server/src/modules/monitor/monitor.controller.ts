import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MetricSnapshot } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MonitorService } from './monitor.service';

@ApiTags('monitor')
@UseGuards(JwtAuthGuard)
@Controller('metrics/:nf/snapshot')
export class MonitorController {
  constructor(private readonly service: MonitorService) {}

  @Get()
  @ApiOperation({ summary: '网元 :9090/metrics 与 Info API 快照（AC-11）' })
  snapshot(@Param('nf') nf: string): Promise<MetricSnapshot> {
    return this.service.snapshot(nf);
  }
}
