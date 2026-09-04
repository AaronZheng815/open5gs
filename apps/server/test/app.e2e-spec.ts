import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

interface InjectServer {
  inject(opts: { method: string; url: string }): Promise<{ statusCode: number; payload: string }>;
}

describe('App (e2e)', () => {
  let app: NestFastifyApplication;
  let instance: InjectServer;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    instance = app.getHttpAdapter().getInstance() as unknown as InjectServer;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) -> 200 ok', async () => {
    const res = await instance.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('ok');
  });
});
