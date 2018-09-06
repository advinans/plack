import { BaseLogger as PinoLogger } from 'pino';
import pino = require('pino');
import flatstr = require('flatstr');
export {
  LogEntry,
  ErrorContext,
  LogEntryHttpRequest,
  LogEntryOperation,
  LogEntrySourceLocation,
} from './constants';
import { LogEntry, LOGGING_OPERATION, LogEntryOperation } from './constants';
import path = require('path');
import { Writable, Duplex, Transform } from 'stream';
import { asJson } from './util';

const {
  asJsonSym,
  endSym,
  lsCacheSym,
  serializersSym,
  wildcardGsym,
} = require('pino/lib/symbols');

export interface LogFn {
  (msg: string, ...args: any[]): void;
  (obj: LogEntry, msg: string, ...args: any[]): void;
  (obj: LogEntry, err: Error): void;
  (objOrMsg: LogEntry | string): void;
}

/**
 * Service identification, for error reporting.
 *
 * This is appended to error reports, and can be useful to identify the
 * service on start-up and other contexts.
 */
export interface ServiceContext {
  service: string;
  version: string;
}

export interface BaseLogger extends PinoLogger {
  serviceContext: ServiceContext;
  emergency: LogFn;
  alert: LogFn;
  critical: LogFn;
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  notice: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;

  /**
   * Create a logger for a long-running operation by providing `id` and
   * `producer`.
   */
  operation: (options: { id?: string; producer?: string }) => Logger;
}

export interface LoggerOptions extends pino.LoggerOptions {
  base?: object;
  serviceContext?: ServiceContext;
}

export type Logger = BaseLogger & { [key: string]: LogFn };

const severity: any = {
  10: 'DEBUG',
  20: 'DEBUG',
  30: 'INFO',
  35: 'NOTICE',
  40: 'WARNING',
  50: 'ERROR',
  60: 'CRITICAL',
  70: 'ALERT',
  80: 'EMERGENCY',
};

export function plack(): Logger;
export function plack(options: LoggerOptions): Logger;
export function plack(
  options: LoggerOptions,
  destination: Writable | Duplex | Transform | WritableStream,
): Logger;
export function plack(
  options?: LoggerOptions,
  destination?: Writable | Duplex | Transform | WritableStream,
): Logger {
  options = options || {};

  const instance = pino(
    {
      messageKey: 'message',
      changeLevelName: 'severity',
      useLevelLabels: true,
      base: options.base || {},
      serializers: {
        err: () => undefined,
        ...options.serializers,
      },
      customLevels: {
        notice: 35,
        alert: 70,
        emergency: 80,
      },
      ...options,
    } as any,
    destination as any,
  );

  // For error reporting
  (instance as any).serviceContext =
    options.serviceContext || defaultServiceContext();

  // dont include log version specifier
  (instance as any).end = '}\n';

  instance[lsCacheSym] = Object.keys(instance.levels.labels).reduce((o, k) => {
    (o as any)[k] = `{"severity":"${severity[Number(k)]}"`;
    return o;
  }, instance[lsCacheSym]);

  (instance as any)[endSym] = '}\n';
  (instance as any)[asJsonSym] = asJson;

  instance.critical = instance.fatal;

  (instance as any).operation = function(options: {
    id?: string;
    producer?: string;
  }) {
    const { id, producer } = options;

    const serializer: pino.SerializerFn = value => {
      if (value.first == null && value.last == null) {
        return value;
      }

      const operation = { id, producer } as LogEntryOperation;
      if (value.first) {
        operation.first = value.first;
        delete value.first;
      }
      if (value.last) {
        operation.last = value.last;
        delete value.last;
      }
      value[LOGGING_OPERATION] = operation;

      return value;
    };

    // Create a child with these the operation as a child binding
    const child = instance.child({
      [LOGGING_OPERATION]: { id, producer },
    });

    // But if you pass `last` or `true`, then override the child binding
    // with information about the operation being done. `chindings` are
    // unconditionally applied to data, so we can't remove them...
    (child as any)[serializersSym][wildcardGsym] = serializer;

    return child;
  };

  return (instance as any) as Logger;
}

export function defaultServiceContext(service?: string): ServiceContext {
  if (!service) {
    try {
      const pkg = require(path.resolve(process.cwd(), 'package.json'));
      service = path.basename(pkg.name);
    } catch (err) {
      err.message = `Cannot determine service context name: ${err.message}`;
      throw err;
    }
  }

  return {
    service,
    version: process.env.VERSION || 'latest',
  };
}

export default plack;
