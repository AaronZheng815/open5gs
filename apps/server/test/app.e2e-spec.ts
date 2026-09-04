import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { setupSwagger } from '../src/common/openapi.setup';

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
    setupSwagger(app);
    app.useGlobalFilters(new HttpExceptionFilter());
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

  it('/api/docs exposes the Swagger UI', async () => {
    const res = await instance.inject({ method: 'GET', url: '/api/docs/' });
    expect(res.statusCode).toBe(200);
  });

  it('unknown API route returns ProblemDetails-style 404', async () => {
    const res = await instance.inject({ method: 'GET', url: '/api/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.payload).toContain('type');
  });
});
