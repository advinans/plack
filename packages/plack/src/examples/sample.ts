import 'source-map-support/register';
import plack from '../';

const log = plack();
// log.level = 'trace';

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

log.trace('Log level configurable through `LOG_LEVEL`');

// string index signature works
const s: string = 'info';
log[s]('information');
