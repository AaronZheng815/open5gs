import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { setupSwagger } from './common/openapi.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix('api');
  setupSwagger(app);
  app.useGlobalFilters(new HttpExceptionFilter());
  const port = Number(process.env.PORT ?? 5000);
  await app.listen(port, '0.0.0.0');
  console.log(`NMS Console server listening on http://localhost:${port}`);
}

void bootstrap();
