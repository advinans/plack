#!/usr/bin/env node

import split = require('split2');
import Parse = require('fast-json-parse');
import moment = require('moment');
import chalk from 'chalk';

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

const standardKeys = ['severity', 'time', 'message'];

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
    const value = parsed.value;

    if (parsed.err) {
      return line + eol;
    }

    let oline = formatTime(value.time) + ' ' + asColoredLevel(value.severity);
    oline += ' ';

    if (value.message) {
      oline += chalk.cyan(value.message);
    }

    oline += eol;

    if (value.type === 'Error') {
      oline += '    ' + withSpaces(value.stack, eol) + eol;
    } else {
      oline += valueFields(value, eol);
    }

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

process.stdin.pipe(pretty()).pipe(process.stdout);
