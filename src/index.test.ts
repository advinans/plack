import plack from '.';
import { Writable } from 'stream';

class DumpStream extends Writable {
  public data: string;

  constructor() {
    super();
    this.data = '';
  }

  write(chunk: any, cb?: Function): boolean;
  write(chunk: any, encoding?: string, cb?: Function): boolean;
  write(chunk: any, encoding?: any, cb?: any) {
    this.data += chunk;
    return true;
  }
}

beforeAll(() => {
  global.Date.now = jest.fn(() => 1536248050595);
});

it('should have all the levels', () => {
  const stream = new DumpStream();
  const log = plack({}, stream);
  log.level = 'trace';

  log.trace('Trace!');
  log.debug('Debug!');
  log.info('Info!');
  log.notice('Notice!');
  log.critical('Critical!');
  log.alert('Alert!');
  log.emergency('Emergency!');

  stream.end();
  expect(stream.data).toMatchInlineSnapshot(`
"{\\"severity\\":\\"DEBUG\\",\\"time\\":1536248050595,\\"message\\":\\"Trace!\\"}
{\\"severity\\":\\"DEBUG\\",\\"time\\":1536248050595,\\"message\\":\\"Debug!\\"}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"Info!\\"}
{\\"severity\\":\\"NOTICE\\",\\"time\\":1536248050595,\\"message\\":\\"Notice!\\"}
{\\"severity\\":\\"CRITICAL\\",\\"time\\":1536248050595,\\"message\\":\\"Critical!\\"}
{\\"severity\\":\\"ALERT\\",\\"time\\":1536248050595,\\"message\\":\\"Alert!\\"}
{\\"severity\\":\\"EMERGENCY\\",\\"time\\":1536248050595,\\"message\\":\\"Emergency!\\"}
"
`);
});

it('should log simple messages', () => {
  const stream = new DumpStream();

  const log = plack({}, stream);

  log.info('server up');
  log.info({ id: '3fd5eae0-fbea-448d-b8d1-8ff2933cc43d' }, 'updated entity');
  log.info({
    httpRequest: {
      requestMethod: 'GET',
      requestUrl: 'http://example.com/some/info?color=red',
      requestSize: '3000',
      status: 200,
      responseSize: '1000',
      userAgent:
        'Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; Q312461; .NET CLR 1.0.3705)',
      remoteIp: '192.168.1.1',
      referer: 'http://example.com/refererr',
      latency: '3.5s',
    },
    field: 'value',
  });

  log.info(
    {
      'logging.googleapis.com/operation': {
        id: '9bf48d24-cd65-4699-9d2f-2c42bcc08437',
        producer: 'main-producer',
        first: true,
      },
    },
    'start of operation',
  );

  log.info(
    {
      'logging.googleapis.com/operation': {
        id: '9bf48d24-cd65-4699-9d2f-2c42bcc08437',
        producer: 'main-producer',
      },
    },
    'middle of operation',
  );

  log.info(
    {
      'logging.googleapis.com/operation': {
        id: '9bf48d24-cd65-4699-9d2f-2c42bcc08437',
        producer: 'main-producer',
        last: true,
      },
    },
    'end of operation',
  );

  stream.end();

  expect(stream.data).toMatchInlineSnapshot(`
"{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"server up\\"}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"updated entity\\",\\"id\\":\\"3fd5eae0-fbea-448d-b8d1-8ff2933cc43d\\"}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"httpRequest\\":{\\"requestMethod\\":\\"GET\\",\\"requestUrl\\":\\"http://example.com/some/info?color=red\\",\\"requestSize\\":\\"3000\\",\\"status\\":200,\\"responseSize\\":\\"1000\\",\\"userAgent\\":\\"Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; Q312461; .NET CLR 1.0.3705)\\",\\"remoteIp\\":\\"192.168.1.1\\",\\"referer\\":\\"http://example.com/refererr\\",\\"latency\\":\\"3.5s\\"},\\"field\\":\\"value\\"}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"start of operation\\",\\"logging.googleapis.com/operation\\":{\\"id\\":\\"9bf48d24-cd65-4699-9d2f-2c42bcc08437\\",\\"producer\\":\\"main-producer\\",\\"first\\":true}}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"middle of operation\\",\\"logging.googleapis.com/operation\\":{\\"id\\":\\"9bf48d24-cd65-4699-9d2f-2c42bcc08437\\",\\"producer\\":\\"main-producer\\"}}
{\\"severity\\":\\"INFO\\",\\"time\\":1536248050595,\\"message\\":\\"end of operation\\",\\"logging.googleapis.com/operation\\":{\\"id\\":\\"9bf48d24-cd65-4699-9d2f-2c42bcc08437\\",\\"producer\\":\\"main-producer\\",\\"last\\":true}}
"
`);
});

class MyError extends Error {
  public extra: any;

  constructor(message: string, extra?: any) {
    super(message);

    // v8 stack traces use the `name` property of the error object, which
    // is not set automatically
    this.name = this.constructor.name;
    this.extra = extra;
  }
}

it('should log errors', () => {
  const stream = new DumpStream();
  const log = plack(
    { serviceContext: { service: 'test', version: '1.0.0' } },
    stream,
  );

  log.error(new Error('Standard error'));
  log.error(new MyError('Custom error', { extra: 'properties' }));
  log.error(
    { context: { httpRequest: { method: 'GET' } } },
    new MyError('Custom error', { extra: 'properties' }),
  );
  log.error(
    new MyError('Standard error', { extra: 'properties' }),
    'Message about error',
  );

  stream.end();

  // We need to replace the paths from the stack traces.
  const data = stream.data.replace(/\((.+?)\)/g, '(path:line:col)');

  expect(data).toMatchInlineSnapshot(`
"{\\"severity\\":\\"ERROR\\",\\"time\\":1536248050595,\\"message\\":\\"Error: Standard error\\\\n    at Object.<anonymous>.it (path:line:col)\\\\n    at Object.asyncJestTest (path:line:col)\\\\n    at resolve (path:line:col)\\\\n    at new Promise (path:line:col)\\\\n    at mapper (path:line:col)\\\\n    at promise.then (path:line:col)\\\\n    at process._tickCallback (path:line:col)\\",\\"type\\":\\"Error\\",\\"serviceContext\\":{\\"service\\":\\"test\\",\\"version\\":\\"1.0.0\\"}}
{\\"severity\\":\\"ERROR\\",\\"time\\":1536248050595,\\"message\\":\\"MyError: Custom error\\\\n    at Object.<anonymous>.it (path:line:col)\\\\n    at Object.asyncJestTest (path:line:col)\\\\n    at resolve (path:line:col)\\\\n    at new Promise (path:line:col)\\\\n    at mapper (path:line:col)\\\\n    at promise.then (path:line:col)\\\\n    at process._tickCallback (path:line:col)\\",\\"type\\":\\"MyError\\",\\"serviceContext\\":{\\"service\\":\\"test\\",\\"version\\":\\"1.0.0\\"},\\"extra\\":{\\"extra\\":\\"properties\\"}}
{\\"severity\\":\\"ERROR\\",\\"time\\":1536248050595,\\"message\\":\\"MyError: Custom error\\\\n    at Object.<anonymous>.it (path:line:col)\\\\n    at Object.asyncJestTest (path:line:col)\\\\n    at resolve (path:line:col)\\\\n    at new Promise (path:line:col)\\\\n    at mapper (path:line:col)\\\\n    at promise.then (path:line:col)\\\\n    at process._tickCallback (path:line:col)\\",\\"type\\":\\"MyError\\",\\"serviceContext\\":{\\"service\\":\\"test\\",\\"version\\":\\"1.0.0\\"},\\"context\\":{\\"httpRequest\\":{\\"method\\":\\"GET\\"}},\\"extra\\":{\\"extra\\":\\"properties\\"}}
{\\"severity\\":\\"ERROR\\",\\"time\\":1536248050595,\\"message\\":\\"Message about error\\",\\"type\\":\\"MyError\\",\\"stack\\":\\"MyError: Standard error\\\\n    at Object.<anonymous>.it (path:line:col)\\\\n    at Object.asyncJestTest (path:line:col)\\\\n    at resolve (path:line:col)\\\\n    at new Promise (path:line:col)\\\\n    at mapper (path:line:col)\\\\n    at promise.then (path:line:col)\\\\n    at process._tickCallback (path:line:col)\\",\\"extra\\":{\\"extra\\":\\"properties\\"}}
"
`);
});
