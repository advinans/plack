# fluentd-gcp compatible Stackdriver logging for node

Logs from applications running in a Kubernetes cluster are automatically picked up a `fluentd` daemon set if Stackdriver logging is enabled. By formatting these logs as JSON objects, proper Stackdriver [LogEntry][logentry] objects are created, including `HttpRequest` properties and severity levels.

This is a small library to log JSON log entries in this format, based on [pino][pino]. Pino uses the Bunyan log format, but with some small tweaks we can make it talk Stackdriver. It maps pino log levels to Stackdriver severity levels, and adds `notice`, `alert` and `emergency` severities.

The fluentd instance (as of 2018-01-18) does not convert all fields in the JSON payload to [LogEntry][logentry] fields. Which ones it does pick up is a result of trial and error.

Also included is a pretty printer for local development.

## Usage

```typescript
import plack from '@advinans/plack;

const log = plack();
log.info('hello world');
log.alert('red alert!');
log.error(new Error('an error'));
```

## What gets picked up?

### HttpRequest

For logging HTTP requests, it seems like the fluentd instance does not pick
up:

* `serverIp`
* `cacheLookup`
* `cacheHit`
* `cacheValidatedWithOriginServer`
* `cacheFillBytes`
* `protocol`

Other fields on `httpRequest` property are picked up properly.

### LogEntryOperation (`operation`)

`operation` is not picked up in any particular way but simply left as part of the JSON payload.

### LogEntrySourceLocation (`sourceLocation`)

`sourceLocation` is not picked up.

### labels

`labels` is not picked up.

### time

`time` is stripped from the payload, but it seems like Stackdriver ignores any timestamp set.

[logentry]: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
[pino]: https://github.com/pinojs/pino
