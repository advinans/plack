import 'source-map-support/register';
import plack from '../';

const log = plack({
  // This is good to set for good Stackdriver error reporting. When logging an
  // error it will be added to the log entry. If not included, reported errors
  // will be marked as just coming from `gke_instances` when running in
  // Kubernetes
  serviceContext: { service: 'plack-use', version: '1.0.1' },
});
log.level = 'trace';

class MyError extends Error {
  constructor(message: string) {
    super(message);

    // correct class name in stack trace
    this.name = this.constructor.name;
  }
}

log.info('server up and listening on port 8080');
log.info(
  { userAccountId: '6fba0a63-f544-4cd8-becd-08e30dc47831' },
  'Updated user account',
);

// these fields are picked up correctly
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

log.error(new MyError('Custom error'));

// This will be reported to Stackdriver Error logging because the message is
// the stack trace.
log.error(new Error('Standard error'));

// This will not be reported because the message is not a stack trace.
log.error(new Error('Standard error'), 'Message about error');

// If you pass an `err` object, that will be special cased. This is how you
// can pass additional context.
log.error({
  err: new MyError('This is an error'),
  context: {
    httpRequest: {
      method: 'GET',
      responseStatusCode: 500,
      url: 'http://example.com',
    },
  },
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

// string index signature works
const s: string = 'info';
log[s]('information');
