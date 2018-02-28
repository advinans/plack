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

```typescript
import plack from '@advinans/plack';

const log = plack({
  // By adding this, Stackdriver error reporting is improved.
  serviceContext: {
    service: 'plack-example',
    version: '1.0.0',
  },
});

log.info('hello world');
log.alert('red alert!');

// The stack trace gets logged so that the error gets picked up by Stackdriver
// error reporting. Configure the logger with a service context (see above)
// to have correct source information -- services running in Kubernetes will
// otherwise simply be `gke_instances`.
log.error(new Error('an error'));

// To provide additional context about an error that you wish to be reported
// as an error in Stackdriver, either pass the error as `err` on the object,
// or in place of message.
log.error(
  { context: { httpRequest: { method: 'GET', responseStatusCode: 500 } } },
  new Error('another error'),
);
```

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
