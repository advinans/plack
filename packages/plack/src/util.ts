import { fullStack } from 'verror';

const {
  lsCacheSym,
  endSym,
  stringifySym,
  stringifiersSym,
  messageKeyStringSym,
  chindingsSym,
  serializersSym,
  wildcardGsym,
} = require('pino/lib/symbols');

export function asJson(
  this: any,
  obj: any,
  msg: string | undefined | Error,
  num: number,
  time: number,
) {
  const hasObj = obj !== undefined && obj !== null;
  const objError = hasObj && obj instanceof Error;
  const msgErr = msg instanceof Error;
  let err = undefined;
  if (objError) {
    err = obj;
  } else if (msgErr) {
    err = msg;
  }
  const msgIsStackTrace = msgErr || (!msg && objError);

  msg = msgIsStackTrace ? fullStack(err) : msg || undefined;
  const stringify = this[stringifySym];
  const stringifiers = this[stringifiersSym];
  const end = this[endSym];
  const messageKeyString = this[messageKeyStringSym];
  const chindings = this[chindingsSym];
  const serializers = this[serializersSym];
  var data = this[lsCacheSym][num] + time;
  if (msg !== undefined) {
    data += messageKeyString + asString('' + msg);
  }
  // we need the child bindings added to the output first so instance logged
  // objects can take precedence when JSON.parse-ing the resulting log line
  data = data + chindings;
  var value;
  if (hasObj === true) {
    var notHasOwnProperty = obj.hasOwnProperty === undefined;
    if (err) {
      if (!msgIsStackTrace) {
        data += ',"stack":' + stringify(fullStack(err));
      }

      if (this.serviceContext && (msgIsStackTrace || obj.reportLocation)) {
        data += ',"serviceContext":' + stringify(this.serviceContext);
      }

      if (!objError) {
        const { name, ...rest } = err;
        obj = { ...obj, ...rest };
      }
    }
    // if global serializer is set, call it first
    if (serializers[wildcardGsym]) {
      obj = serializers[wildcardGsym](obj);
    }
    for (var key in obj) {
      if (objError) {
        // Filter uninteresting error properties, including bogus data from
        // VErrors
        switch (key) {
          case 'message':
          case 'name':
          case 'jse_shortmsg':
          case 'jse_cause':
            continue;
          case 'jse_info':
            if (Object.keys(obj[key]).length === 0) {
              continue;
            }
        }
      }

      value = obj[key];
      if (
        (notHasOwnProperty || obj.hasOwnProperty(key)) &&
        value !== undefined
      ) {
        value = serializers[key] ? serializers[key](value) : value;

        switch (typeof value) {
          case 'undefined':
            continue;
          case 'number':
          case 'boolean':
            if (stringifiers[key]) value = stringifiers[key](value);
            data += ',"' + key + '":' + value;
            continue;
          case 'string':
            value = (stringifiers[key] || asString)(value);
            break;
          default:
            value = (stringifiers[key] || stringify)(value);
        }
        if (value === undefined) continue;
        data += ',"' + key + '":' + value;
      }
    }
  }
  return data + end;
}

function asString(str: string) {
  var result = '';
  var last = 0;
  var found = false;
  var point = 255;
  const l = str.length;
  if (l > 100) {
    return JSON.stringify(str);
  }
  for (var i = 0; i < l && point >= 32; i++) {
    point = str.charCodeAt(i);
    if (point === 34 || point === 92) {
      result += str.slice(last, i) + '\\';
      last = i;
      found = true;
    }
  }
  if (!found) {
    result = str;
  } else {
    result += str.slice(last);
  }
  return point < 32 ? JSON.stringify(str) : '"' + result + '"';
}
