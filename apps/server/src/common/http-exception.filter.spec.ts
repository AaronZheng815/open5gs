import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost() {
  const reply = { status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({ url: '/api/boom' }),
    }),
  };
  return { reply, host };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('normalizes an HttpException into ProblemDetails with its status', () => {
    const { reply, host } = mockHost();
    filter.catch(new HttpException('nope', HttpStatus.BAD_REQUEST), host as never);
    expect(reply.status).toHaveBeenCalledWith(400);
    const body = reply.send.mock.calls[0][0];
    expect(body).toMatchObject({ type: 'about:blank', title: 'nope', status: 400, instance: '/api/boom' });
  });

  it('normalizes a generic Error into 500 Internal Server Error', () => {
    const { reply, host } = mockHost();
    filter.catch(new Error('boom'), host as never);
    expect(reply.status).toHaveBeenCalledWith(500);
    const body = reply.send.mock.calls[0][0];
    expect(body).toMatchObject({ title: 'Internal Server Error', status: 500, detail: 'boom' });
  });
});
