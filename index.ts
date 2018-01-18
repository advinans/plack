import { BaseLogger, LogFn } from 'pino';
import pino = require('pino');
import flatstr = require('flatstr');

export interface Logger extends BaseLogger {
  notice: LogFn;
  alert: LogFn;
  emergency: LogFn;
}

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

export function plack(): Logger {
  const instance = pino({
    // dont include hostname, pid et cetera
    base: {},
    messageKey: 'message',
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

  instance.addLevel('notice', 35);
  instance.addLevel('alert', 70);
  instance.addLevel('emergency', 80);
  return (instance as any) as Logger;
}

export default plack;
