import 'source-map-support/register';
import plack from '../';

const log = plack({
  // This is good to set for good Stackdriver error reporting. When logging an
  // error it will be added to the log entry. If not included, reported errors
  // will be marked as just coming from `gke_instances` when running in
  // Kubernetes
  serviceContext: { service: 'plack-error-use', version: '1.0.1' },
});

class MyError extends Error {
  public extra: any;

  constructor(message: string, extra?: any) {
    super(message);

    // correct class name in stack trace; plack will not log the `name`
    // property of an error...
    this.name = this.constructor.name;
    this.extra = extra;
  }
}

// // This will be reported to Stackdriver Error logging because the message is
// // the stack trace.
log.error(new Error('Standard error'));

// If you log an error with additional properties, they will be logged
log.error(new MyError('Custom error', { extra: 'properties' }));

// If you log with an object with extra context, that gets logged
log.error(
  { context: { httpRequest: { method: 'GET' } } },
  new MyError('Custom error', { extra: 'properties' }),
);

// If you don't log a stack trace as a message, Stackdriver error reporting
// will not pick it up.
log.error(
  new MyError('Standard error', { extra: 'properties' }),
  'Message about error',
);
