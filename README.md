# fluentd-gcp compatible Stackdriver logging for node

Logs from applications running in a Kubernetes cluster are automatically picked up a `fluentd` daemon set if Stackdriver logging is enabled. By formatting these logs as JSON objects, proper Stackdriver [LogEntry][logentry] objects are created, including `HttpRequest` properties and severity levels.

This is a small library to log JSON log entries in this format, based on [pino][pino]. Pino uses the Bunyan log format, but with some small tweaks we can make it talk Stackdriver. It maps pino log levels to Stackdriver severity levels, and adds `notice`, `alert` and `emergency` severities.

The fluentd instance (as of 2018-01-18) does not convert all fields in the JSON payload to [LogEntry][logentry] fields. See below for information about what gets picked up. This project defines an interface for log entries with these fields.

Also included is a pretty printer for local development called `plack`. You can pipe log output through this utility. It doesn't have a lot of configuration.

```shell
$ node my-program.js | plack
```

## Usage

```typescript
import plack from '@advinans/plack';

const log = plack();
log.info('hello world');
log.alert('red alert!');
log.error(new Error('an error'));
```

## What gets picked up?

The `fluentd` daemon set translates JSON payloads to StackDriver entries using a plugin called [fluentd-plugin-google-cloud][fluentd-plugin-google-cloud]. Which fields get picked up can be figured out from the source code for this plugin (https://github.com/GoogleCloudPlatform/fluent-plugin-google-cloud/blob/master/lib/fluent/plugin/out_google_cloud.rb#L115). `time` is stripped from the payload, but it seems like Stackdriver ignores any timestamp set.

Here's some sample code illustrating sending rich log entries:

```typescript
import plack from '@advinans/plack';

const log = plack.plack();
log.info(
  {
    httpRequest: {
      requestMethod: 'GET',
      requestUrl: 'https://localhost:8080',
      requestSize: '2048',
      status: 400,
      responseSize: '1024',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
      remoteIp: '128.23.12.1',
      referer: 'https://google.com',
      cacheHit: false,
      cacheValidatedWithOriginServer: false,
      latency: '3s',
    },
    'logging.googleapis.com/sourceLocation': {
      file: 'index.js',
      function: 'main',
      line: '12',
    },
  },
  'access',
);

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
```

[logentry]: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
[pino]: https://github.com/pinojs/pino
[fluentd-plugin-google-cloud]: https://github.com/GoogleCloudPlatform/fluent-plugin-google-cloud
