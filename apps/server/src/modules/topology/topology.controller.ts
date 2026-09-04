import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TopologyGraph } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TopologyService } from './topology.service';

@ApiTags('topology')
@UseGuards(JwtAuthGuard)
@Controller('topology')
export class TopologyController {
  constructor(private readonly service: TopologyService) {}

  @Get()
  @ApiOperation({ summary: '网元拓扑图（节点+架构依赖边）AC-9' })
  topology(): TopologyGraph {
    return this.service.buildTopology();
  }
}
