# fluentd-gcp compatible Stackdriver logging for node

Logs from applications running in a Kubernetes cluster are automatically picked up a `fluentd` daemon set if Stackdriver logging is enabled. By formatting these logs as JSON objects, proper Stackdriver [LogEntry][logentry] objects are created, including `HttpRequest` properties and severity levels.

This is a small library to log JSON log entries in this format, based on [pino][pino]. Pino uses the Bunyan log format, but with some small tweaks we can make it talk Stackdriver. It maps pino log levels to Stackdriver severity levels, and adds `notice`, `alert` and `emergency` severities.

The fluentd instance (as of 2018-01-18) does not convert all fields in the JSON payload to [LogEntry][logentry] fields. See below for information about what gets picked up. This project defines an interface for log entries with these fields.

Also included is a pretty printer for local development called `plack`. You can pipe log output through this utility. It doesn't have a lot of configuration.

```shell
$ node my-program.js | plack
[2018-02-28T13:43:23+01:00] INFO server up and listening on port 8080
[2018-02-28T13:43:23+01:00] INFO Updated user account
    userAccountId: "6fba0a63-f544-4cd8-becd-08e30dc47831"
[2018-02-28T13:43:23+01:00] INFO
    GET http://example.com/some/info?color=red
      requestSize: "3000"
      status: 200
      responseSize: "1000"
      userAgent: "Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; Q312461; .NET CLR 1.0.3705)"
      remoteIp: "192.168.1.1"
      referer: "http://example.com/refererr"
      latency: "3.5s"

    field: "value"
[2018-02-28T13:43:23+01:00] ERROR
    MyError: Custom error
        at Object.<anonymous> (/Users/victor/code/advinans/@advinans--plack/examples/sample.ts:45:11)
        at Module._compile (module.js:660:30)
        at Object.Module._extensions..js (module.js:671:10)
        at Module.load (module.js:573:32)
        at tryModuleLoad (module.js:513:12)
        at Function.Module._load (module.js:505:3)
        at Function.Module.runMain (module.js:701:10)
        at startup (bootstrap_node.js:194:16)
        at bootstrap_node.js:618:3

    serviceContext: {
      "service": "plack-use",
      "version": "1.0.1"
    }
    name: "MyError"
```

## Usage

### Basic usage

```typescript
import plack from '@advinans/plack';

// Accepts standard pino configuration, but you shouldn't have to configure
// it at all
const log = plack();

log.info('hello world');
log.alert('red alert!');
```

### Errors

```typescript
import { VError } from 'verror';

// You can pass an explicit service context, but a default one is inferred
// based on your package.json (`.name`) and environment if not provided.
// We read `process.env.VERSION` from the environment, because we don't bump
// package.json versions (for Docker layering purposes)
const log = plack();

// The stack trace gets logged so that the error gets picked up by Stackdriver
// error reporting. It uses `VError.fullstack` to report a 'full" stack trace.
log.error(new Error('an error'));

// To provide additional context about an error that you wish to be reported
// as an error in Stackdriver, send an additional object. Enumerable error
// properties are also reported.
log.error(
  { context: { httpRequest: { method: 'GET', responseStatusCode: 500 } } },
  new Error('another error'),
);

// You *should* create custom error classes to improve error grouping in
// Stackdriver. You *must* set `this.name = this.constructor.name` in order
// for the stack trace to include the name of your custom error class.
class MyError extends Error {
  constructor(message?: string) {
    super(message);

    this.name = this.constructor.name;
  }
}

log.error(new MyError('My little error'));
log.error(
  new VError({ cause: new MyError('root cause'), name: 'RequestError' }),
  'The request failed',
);
```

### Operations

Stackdriver support logging long-running operations ([LogEntryOperation](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogEntryOperation)). You can explicitly log such objects under the `LOGGING_OPERATION` key, or you can create a child logger:

```typescript
const log = plack();

const op1 = log.operation({
  // An arbitrary producer identifier. The combination of id and
  // producer must be globally unique.
  producer: 'advinans/service-company/my-producer',
  
  // An arbitrary operation identifier. Log entries with the same
  // identifier are assumed to be part of the same operation.
  id: 'jobs-processor-8eb41c3d-3998-4360-9ea7-0132642e2d38',
});

op1.log({ first: true }, 'Operation starts');
op1.log('Operation runs');
op1.log({ last: true }, 'Operation ends');
```

Note: This uses pino's child bindings to create the initial operation key. Such bindings cannot be removed, so when logging `first` or `last` the logging key is repeated in the JSON output. This may cause problems for some JSON parsers but Stackdriver handles it gracefully (last value wins).

## What gets picked up

The `fluentd` daemon set translates JSON payloads to StackDriver entries using a plugin called [fluentd-plugin-google-cloud][fluentd-plugin-google-cloud]. Which fields get picked up can be figured out from the source code for this plugin ([github.com/GoogleCloudPlatform/fluent-plugin-google][fluentd-plugin-google-cloud-plugin]). `time` is stripped from the payload, but it seems like Stackdriver ignores any timestamp set.

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
[fluentd-plugin-google-cloud-plugin]: https://github.com/GoogleCloudPlatform/fluent-plugin-google-cloud/blob/master/lib/fluent/plugin/out_google_cloud.rb#L115
