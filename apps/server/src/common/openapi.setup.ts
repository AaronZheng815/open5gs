import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * 装配 @nestjs/swagger 生成 OpenAPI 3.0 文档并在 /api/docs 提供 UI。
 * Fastify 适配器需安装 @fastify/swagger 与 @fastify/swagger-ui，
 * SwaggerModule.setup 会将其注册到 Fastify 实例。
 */
export function setupSwagger(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NMS Console API')
    .setDescription('Open5GS NMS Console aggregation API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
