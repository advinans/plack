import { BaseLogger as PinoLogger } from 'pino';
import pino = require('pino');
import flatstr = require('flatstr');
export { LogEntry } from './constants';
import { LogEntry } from './constants';

export interface LogFn {
  (msg: string, ...args: any[]): void;
  (obj: LogEntry, msg: string, ...args: any[]): void;
  (objOrMsg: LogEntry | string): void;
}

export interface BaseLogger extends PinoLogger {
  emergency: LogFn;
  alert: LogFn;
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  notice: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
}

export type Logger = BaseLogger & { [key: string]: LogFn };

const severity: any = {
  10: 'DEBUG',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARNING',
  50: 'ERROR',
  60: 'CRITICAL',
};

function addLevel(this: any, name: string, lvl: number) {
  // all we do is fix the lscache
  Object.getPrototypeOf(this).addLevel(name, lvl);
  (this as any)._lscache[lvl] = flatstr(`{"severity":"${name.toUpperCase()}"`);
}

// Need to override this to change how errors are serialized
// Copy-paste
function asJson(this: any, obj: any, msg: string | undefined, num: number) {
  // to catch both null and undefined
  var hasObj = obj !== undefined && obj !== null;
  var objError = hasObj && obj instanceof Error;
  msg = !msg && objError ? obj.message : msg || undefined;
  var data = this._lscache[num] + this.time();
  if (msg !== undefined) {
    // JSON.stringify is safe here
    data += this.messageKeyString + JSON.stringify('' + msg);
  }
  // we need the child bindings added to the output first so that logged
  // objects can take precedence when JSON.parse-ing the resulting log line
  data = data + this.chindings;
  var value;
  if (hasObj) {
    var notHasOwnProperty = obj.hasOwnProperty === undefined;
    if (objError) {
      data += ',"type":"Error","stack":' + this.stringify(obj.stack);
    }
    for (var key in obj) {
      value = obj[key];
      if (
        (notHasOwnProperty || obj.hasOwnProperty(key)) &&
        value !== undefined
      ) {
        value = this.stringify(
          this.serializers[key] ? this.serializers[key](value) : value,
        );
        if (value !== undefined) {
          data += ',"' + key + '":' + value;
        }
      }
    }
  }
  return data + this.end;
}

export function plack(options?: pino.LoggerOptions): Logger {
  options = options || {};

  const instance = pino({
    // dont include hostname, pid et cetera
    base: {},
    messageKey: 'message',
    serializers: {
      err: pino.stdSerializers.err,
    },
    ...options,
  } as any);

  // dont include log version specifier
  (instance as any).end = '}\n';

  // override lscache to output severity and not level
  Object.defineProperty(instance, '_lscache', {
    value: Object.keys(severity).reduce(
      (o, k) => {
        o[k] = flatstr(`{"severity":"${severity[k]}"`);
        return o;
      },
      {} as any,
    ),
  });

  Object.defineProperty(instance, 'addLevel', {
    value: addLevel,
  });

  Object.defineProperty(instance, 'asJson', {
    value: asJson,
  });

  instance.addLevel('notice', 35);
  instance.addLevel('alert', 70);
  instance.addLevel('emergency', 80);
  return (instance as any) as Logger;
}

export default plack;
