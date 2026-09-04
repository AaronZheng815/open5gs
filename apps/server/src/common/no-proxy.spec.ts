import { createServer, type Server } from 'node:http';
import { noProxyFetch, sanitizeChildEnv } from './no-proxy';

describe('sanitizeChildEnv', () => {
  it('removes proxy variables but keeps others', () => {
    const out = sanitizeChildEnv({
      HTTP_PROXY: 'http://127.0.0.1:7897',
      HTTPS_PROXY: 'http://127.0.0.1:7897',
      ALL_PROXY: 'socks5h://127.0.0.1:7897',
      http_proxy: 'http://127.0.0.1:7897',
      https_proxy: 'http://127.0.0.1:7897',
      all_proxy: 'socks5h://127.0.0.1:7897',
      MONGO_URI: 'mongodb://localhost/open5gs',
      PATH: '/usr/bin',
    });
    expect(out.HTTP_PROXY).toBeUndefined();
    expect(out.https_proxy).toBeUndefined();
    expect(out.all_proxy).toBeUndefined();
    expect(out.MONGO_URI).toBe('mongodb://localhost/open5gs');
    expect(out.PATH).toBe('/usr/bin');
  });
});

describe('noProxyFetch', () => {
  let server: Server;
  let port: number;

  beforeAll((done) => {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') port = address.port;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it('reaches a loopback server without proxy interference', async () => {
    const res = await noProxyFetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
