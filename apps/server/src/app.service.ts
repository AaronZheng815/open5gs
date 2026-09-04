import { Injectable } from '@nestjs/common';
import type { NfAsset } from '@open5gs/shared';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'ok';
  }

  asAsset(): NfAsset {
    return { id: 'svc', nfType: 'SVC', addr: '0.0.0.0', status: 'unknown' };
  }
}
