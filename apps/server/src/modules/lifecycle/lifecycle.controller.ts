import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LifecycleStatus } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/auth.types';
import { LifecycleService, type LifecycleTaskRef } from './lifecycle.service';

@ApiTags('lifecycle')
@UseGuards(JwtAuthGuard)
@Controller('nfs/:id/lifecycle')
export class LifecycleController {
  constructor(private readonly service: LifecycleService) {}

  @Get()
  @ApiOperation({ summary: '网元服务状态（= systemctl is-active，AC-6）' })
  status(@Param('id') id: string): Promise<LifecycleStatus> {
    return this.service.statusOf(id);
  }

  @Post(':action')
  @HttpCode(202)
  @ApiOperation({ summary: '触发生命周期动作，返回 202 + 异步任务 id（AC-5）' })
  exec(@Param('id') id: string, @Param('action') action: string, @Req() req: AuthRequest): Promise<LifecycleTaskRef> {
    const actor = req.user?.username ?? 'anonymous';
    return this.service.execAction(id, action, actor);
  }
}
