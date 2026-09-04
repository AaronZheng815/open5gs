import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { NfAssetList } from '@open5gs/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetService } from './asset.service';

@ApiTags('asset')
@UseGuards(JwtAuthGuard)
@Controller()
export class AssetController {
  constructor(private readonly service: AssetService) {}

  @Get('inventory')
  @ApiOperation({ summary: '纯本地配置清单资产模型（离线兜底，AC-8）' })
  inventory(): NfAssetList {
    return this.service.listInventory();
  }

  @Get('nfs')
  @ApiOperation({ summary: '网元资产清单 = 本地清单 + NRF 在线叠加（AC-1/AC-7）' })
  nfs(): Promise<NfAssetList> {
    return this.service.listNfs();
  }
}
