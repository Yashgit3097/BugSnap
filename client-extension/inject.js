/* ================================================================
   inject.js  –  Runs INSIDE the page's JavaScript world

   WHY IS THIS FILE SEPARATE?
   content.js runs in an "isolated world" – it can see the DOM
   but cannot touch the page's own JavaScript variables like
   window.console or window.fetch.
   
   This file is injected as a <script> tag by content.js, so it
   runs IN the page's world. That means it CAN override console
   and fetch to intercept all calls.

   HOW IT COMMUNICATES:
   It uses window.postMessage() to send data to content.js,
   which then forwards it to background.js.
   We use a unique prefix '__JAM_TYPE__' so we don't accidentally
   process messages from other scripts on the page.
   ================================================================ */

(function () {
  'use strict';

  // Guard: only inject once (in case the script somehow runs twice)
  if (window.__JAM_INJECTED__) return;
  window.__JAM_INJECTED__ = true;

  // ── Helper: Post data to content.js ─────────────────────────
  function emit(type, payload) {
    window.postMessage({ __JAM_TYPE__: type, payload }, '*');
  }

  // ── Helper: Circular Reference Replacer ─────────────────────
  function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  // ── 1. Override console methods ──────────────────────────────
  const wrappedObjects = new WeakSet();

  function wrapConsole(consoleObj) {
    if (!consoleObj || wrappedObjects.has(consoleObj)) return;
    wrappedObjects.add(consoleObj);

    ['log', 'warn', 'error', 'info', 'debug'].forEach((method) => {
      let originalMethod = consoleObj[method];

      Object.defineProperty(consoleObj, method, {
        get() {
          return function (...args) {
            // Call the page's original/overridden method
            if (typeof originalMethod === 'function') {
              originalMethod.apply(consoleObj, args);
            }

            try {
              let serializedArgs = [];
              try {
                serializedArgs = args.map((arg) => {
                  if (arg === null) return { type: 'null', value: null };
                  if (arg === undefined) return { type: 'undefined', value: 'undefined' };
                  if (arg instanceof Error) {
                    return { type: 'error', value: arg.toString(), stack: arg.stack || '' };
                  }
                  const type = typeof arg;
                  if (type === 'object') {
                    try {
                      const jsonStr = JSON.stringify(arg, getCircularReplacer());
                      return { type: Array.isArray(arg) ? 'array' : 'object', value: JSON.parse(jsonStr) };
                    } catch (e) {
                      return { type: 'string', value: String(arg) };
                    }
                  }
                  return { type, value: arg };
                });
              } catch (err) {
                serializedArgs = [{ type: 'string', value: '[Serialization Error]' }];
              }

              // Check if we serialized anything to avoid schema validation failure
              if (serializedArgs.length === 0) {
                serializedArgs = [{ type: 'string', value: '[empty log]' }];
              }

              // Encode the serialized arguments list as JSON string so it stores in DB perfectly
              const finalMessage = JSON.stringify(serializedArgs);

              const stack = (method === 'error' && args[0] instanceof Error)
                ? args[0].stack || ''
                : '';

              const logType = method === 'debug' ? 'info' : method;

              emit('CONSOLE', { type: logType, message: finalMessage, stack });
            } catch (err) {
              // Fail-safe to avoid blocking page execution
            }
          };
        },
        set(newMethod) {
          originalMethod = newMethod;
        },
        configurable: true,
        enumerable: true
      });
    });
  }

  // Wrap initial console
  wrapConsole(window.console);

  // Monitor window.console object replacements
  let currentConsole = window.console;
  Object.defineProperty(window, 'console', {
    get() {
      return currentConsole;
    },
    set(newConsole) {
      if (newConsole && newConsole !== currentConsole) {
        wrapConsole(newConsole);
        currentConsole = newConsole;
      }
    },
    configurable: true,
    enumerable: true
  });

  // ── 2. Override fetch ─────────────────────────────────────────
  const _fetch = window.fetch.bind(window);

  window.fetch = async function (...args) {
    const input  = args[0];
    const init   = args[1] || {};
    const url    = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init.method || 'GET').toUpperCase();
    const reqStart = Date.now();

    // Serialize request body safely
    let requestBody = '';
    if (init.body) {
      try { requestBody = typeof init.body === 'string' ? init.body : JSON.stringify(init.body); }
      catch { requestBody = '[unserializable]'; }
    }

    // Capture request headers
    let requestHeaders = {};
    if (init.headers) {
      try {
        if (init.headers instanceof Headers) {
          init.headers.forEach((val, key) => {
            requestHeaders[key] = val;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, val]) => {
            requestHeaders[key] = val;
          });
        } else if (typeof init.headers === 'object') {
          requestHeaders = { ...init.headers };
        }
      } catch (e) { /* ignore */ }
    }

    try {
      const response = await _fetch(...args);
      const duration = Date.now() - reqStart;

      // Capture response headers
      const responseHeaders = {};
      try {
        response.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });
      } catch (e) { /* ignore */ }

      // Clone response before reading, otherwise the original stream gets consumed
      let responseBody = '';
      try {
        const clone = response.clone();
        responseBody = (await clone.text()).substring(0, 2000); // cap at 2KB
      } catch { /* ignore */ }

      emit('NETWORK', {
        url,
        method,
        status: response.status,
        requestHeaders,
        requestBody: requestBody.substring(0, 1000),
        responseHeaders,
        responseBody,
        duration
      });

      return response;
    } catch (err) {
      emit('NETWORK', {
        url,
        method,
        status: 0,
        requestHeaders,
        requestBody,
        responseHeaders: {},
        responseBody: err.message,
        duration: Date.now() - reqStart
      });
      throw err; // re-throw so the page still sees the error
    }
  };

  // ── 3. Override XMLHttpRequest ────────────────────────────────
  // Some older libraries use XHR instead of fetch, so we cover both
  const _XHROpen = XMLHttpRequest.prototype.open;
  const _XHRSend = XMLHttpRequest.prototype.send;
  const _setRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._JAM_method = method;
    this._JAM_url    = url;
    this._JAM_start  = null;
    this._JAM_reqHeaders = {};
    return _XHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    if (!this._JAM_reqHeaders) {
      this._JAM_reqHeaders = {};
    }
    this._JAM_reqHeaders[header] = value;
    return _setRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this._JAM_start = Date.now();
    this._JAM_body  = body;

    this.addEventListener('loadend', () => {
      const duration = Date.now() - (this._JAM_start || Date.now());
      
      // Parse response headers
      const responseHeaders = {};
      try {
        const rawHeaders = this.getAllResponseHeaders() || '';
        rawHeaders.trim().split(/[\r\n]+/).forEach((line) => {
          const parts = line.split(': ');
          const header = parts.shift();
          const value = parts.join(': ');
          if (header) {
            responseHeaders[header.toLowerCase()] = value;
          }
        });
      } catch (e) { /* ignore */ }

      // Safe access to responseText based on responseType
      let responseBody = '';
      try {
        const type = this.responseType;
        if (type === '' || type === 'text') {
          responseBody = (this.responseText || '').substring(0, 2000);
        } else {
          responseBody = `[Binary Data or responseType: ${type}]`;
        }
      } catch (e) {
        responseBody = '[Unreadable response]';
      }

      emit('NETWORK', {
        url:          this._JAM_url || '',
        method:       (this._JAM_method || 'GET').toUpperCase(),
        status:       this.status,
        requestHeaders: this._JAM_reqHeaders || {},
        requestBody:  this._JAM_body ? String(this._JAM_body).substring(0, 1000) : '',
        responseHeaders,
        responseBody,
        duration
      });
    });

    return _XHRSend.apply(this, [body]);
  };

})();
