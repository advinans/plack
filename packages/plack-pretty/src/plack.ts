#!/usr/bin/env node

import split = require('split2');
import Parse = require('fast-json-parse');
import moment = require('moment');
import chalk from 'chalk';
import {
  LogEntryHttpRequest,
  LogEntryOperation,
  LOGGING_OPERATION,
} from '@advinans/plack';

const colors: any = {
  DEFAULT: chalk.white,
  DEBUG: chalk.blue,
  INFO: chalk.green,
  NOTICE: chalk.green,
  WARNING: chalk.yellow,
  ERROR: chalk.red,
  CRITICAL: chalk.bgRed.whiteBright,
  ALERT: chalk.bgRed.whiteBright.bold.underline,
  EMERGENCY: chalk.bgRedBright.whiteBright.bold.underline,
};

const standardKeys = [
  'severity',
  'time',
  'message',
  'err',
  LOGGING_OPERATION,
  'httpRequest',
];

const errRegExp = /Error$/;

function withSpaces(value: string, eol: string) {
  var lines = value.split(/\r?\n/);
  for (var i = 1; i < lines.length; i++) {
    lines[i] = '    ' + lines[i];
  }
  return lines.join(eol);
}

function valueFields(value: any, eol: string) {
  const keys = Object.keys(value);

  return keys.reduce((r, k) => {
    if (standardKeys.indexOf(k) > -1) {
      return r;
    }

    r += `    ${chalk.cyan(k)}: `;
    r += withSpaces(JSON.stringify(value[k], null, 2), eol);
    r += eol;
    return r;
  }, '');
}

function pretty() {
  const stream = split(mapLine);
  const pipe = stream.pipe;
  const eol = '\n';

  stream.pipe = function(dest, opts) {
    return pipe.call(stream, dest, opts);
  };

  return stream;

  function mapLine(line: any) {
    const parsed = new Parse(line);
    let value = parsed.value;

    if (parsed.err || !value || !value.severity || !value.time) {
      return line + eol;
    }

    let oline = formatTime(value.time) + ' ' + asColoredLevel(value.severity);
    oline += ' ';

    if (value[LOGGING_OPERATION]) {
      oline += formatOperation(value[LOGGING_OPERATION]);
    }

    if (value.message) {
      oline += chalk.cyan(value.message);
    }

    oline += eol;

    if (value.httpRequest) {
      oline += formatHttpRequest(value.httpRequest, eol) + eol;
    }

    oline += valueFields({ ...value }, eol);

    return oline;
  }
}

function asColoredLevel(severity: string) {
  severity = severity || 'DEFAULT';
  let color = colors.DEFAULT;
  if (severity && colors.hasOwnProperty(severity)) {
    color = colors[severity];
  }

  return color(severity);
}

function formatTime(time: number) {
  return `[${moment(time).format()}]`;
}

function formatOperation(op: LogEntryOperation): string {
  const firstLast = [];
  if (op.first) {
    firstLast.push('first');
  }
  if (op.last) {
    firstLast.push('last');
  }
  const firstLastStr = firstLast.join(',');
  const id = [op.producer, op.id].filter(Boolean).join(':');

  let message = '';
  if (id) {
    message += chalk.green(id) + ' ';
  }
  if (firstLastStr) {
    message += chalk.blue(firstLastStr);
  }

  if (message) {
    return `(${message.trim()}) `;
  }

  return '';
}

function formatHttpRequest(req: LogEntryHttpRequest, eol: string): string {
  const keys = ['requestMethod', 'requestUrl'];
  const concatted = keys
    .map(k => req[k])
    .filter(Boolean)
    .join(' ');

  let color = chalk.green;
  if (req.status) {
    if (req.status >= 400 && req.status < 500) {
      color = chalk.yellow;
    } else if (req.status >= 500) {
      color = chalk.red;
    }
  }
  const rest = Object.keys(req)
    .filter(k => keys.indexOf(k) === -1)
    .map(k => {
      let line = `  ${chalk.cyan(k)}: `;
      line += withSpaces(JSON.stringify(req[k], null, 2), eol);
      return line;
    })
    .join(eol);

  let s = `    ${color(concatted)}${eol}`;
  s += `    ${withSpaces(rest, eol)}${eol}`;
  return s;
}

process.stdin.pipe(pretty()).pipe(process.stdout);
