import 'source-map-support/register';
import plack from '../';

const log = plack({
  // This is good to set for good Stackdriver error reporting. When logging an
  // error it will be added to the log entry. If not included, Plack will set
  // a default service context
  serviceContext: { service: 'plack-error-use', version: '1.0.1' },
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

class MyError2 extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
