import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = moduleRef.get(AppController);
    appService = moduleRef.get(AppService);
  });

  it('health returns ok', () => {
    expect(controller.getHealth()).toBe('ok');
  });

  it('asAsset returns a shared-typed asset', () => {
    expect(appService.asAsset().status).toBe('unknown');
  });
});
