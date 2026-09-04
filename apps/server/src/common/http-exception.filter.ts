import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

interface ReplyLike {
  status(code: number): ReplyLike;
  send(payload: unknown): ReplyLike;
}

interface RequestLike {
  url: string;
}

/**
 * 全局异常过滤器：把未捕获异常 + HttpException 统一归一为 ProblemDetails 风格骨架，
 * 避免 Nest 默认错误体，并为前端提供稳定的错误结构（对应 EV-002 的错误骨架约定）。
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<ReplyLike>();
    const request = ctx.getRequest<RequestLike>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof Error ? exception.message : String(exception);

    reply.status(status).send({
      type: 'about:blank',
      title: isHttp ? exception.message : 'Internal Server Error',
      status,
      detail,
      instance: request.url,
    });
  }
}
