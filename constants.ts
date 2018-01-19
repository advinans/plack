/**
 * A common proto for logging HTTP requests. Only contains semantics defined
 * by the HTTP specification. Product-specific logging information MUST be
 * defined in a separate message.
 *
 * Fields not specified by this interface are not picked up fluentd, and will
 * be left in the `jsonPayload` of the log entry.
 */
export interface LogEntryHttpRequest {
  /** The request method. Examples: "GET", "HEAD", "PUT", "POST". */
  requestMethod?: string;

  /**
   * The scheme (http, https), the host name, the path and the query portion
   * of the URL that was requested.
   * Example: "http://example.com/some/info?color=red".
   */
  requestUrl?: string;

  /**
   * The size of the HTTP request message in bytes, including the request
   * headers and the request body.
   */
  requestSize?: number | string;

  /**
   * The response code indicating the status of response. Examples: 200, 404.
   */
  status?: number;

  /**
   * The size of the HTTP response message sent back to the client, in bytes,
   * including the response headers and the response body.
   */
  responseSize?: number | string;

  /**
   * The user agent sent by the client. Example: "Mozilla/4.0 (compatible;
   * MSIE 6.0; Windows 98; Q312461; .NET CLR 1.0.3705)".
   */
  userAgent?: string;

  /**
   * The IP address (IPv4 or IPv6) of the client that issued the HTTP request.
   * Examples: "192.168.1.1", "FE80::0202:B3FF:FE1E:8329".
   */
  remoteIp?: string;

  /**
   * The referer URL of the request, as defined in HTTP/1.1 Header Field
   * Definitions.
   */
  referer?: string;

  /**
   * Whether or not an entity was served from cache (with or without
   * validation).
   */
  cacheHit?: boolean;

  /**
   * Whether or not the response was validated with the origin server before
   * being served from cache. This field is only meaningful if cacheHit
   * is True.
   */
  cacheValidatedWithOriginServer?: boolean;

  /**
   * The request processing latency on the server, from the time the request
   * was received until the response was sent. A duration in seconds with up
   * to nine fractional digits, terminated by 's'. Example: "3.5s".
   */
  latency?: string;

  [key: string]: any;

  // These fields do not get picked up from the JSON payload by fluentd
  // serverIp?: string;
  // cacheLookup?: boolean;
  // cacheFillBytes?: number | string;
  // protocol?: string;
}

/**
 * Additional information about a potentially long-running operation with
 * which a log entry is associated.
 */
export interface LogEntryOperation {
  /**
   * An arbitrary operation identifier. Log entries with the same identifier
   * are assumed to be part of the same operation.
   */
  id?: string;

  /**
   * An arbitrary producer identifier. The combination of id and producer must
   * be globally unique. Examples for producer: "MyDivision.MyBigCompany.com",
   * "github.com/MyProject/MyApplication".
   */
  producer?: string;

  /** Set this to True if this is the first log entry in the operation. */
  first?: boolean;

  /** Set this to True if this is the last log entry in the operation. */
  last?: boolean;
}

export interface LogEntrySourceLocation {
  /**
   * Source file name. Depending on the runtime environment, this might be
   * a simple name or a fully-qualified name.
   */
  file?: string;

  /**
   * Line within the source file. 1-based; 0 indicates no line number
   * available.
   */
  line?: string | number;

  /**
   * Optional. Human-readable name of the function or method being invoked,
   * with optional context such as the class or package name. This information
   * may be used in contexts such as the logs viewer, where a file and line
   * number are less meaningful.
   */
  function?: string | number;
}

export interface LogEntryBase {
  httpRequest?: LogEntryHttpRequest;
  'logging.googleapis.com/operation'?: LogEntryOperation;
  'logging.googleapis.com/sourceLocation'?: LogEntrySourceLocation;

  [key: string]: any;
}

export type LogEntry = LogEntryBase | object;
