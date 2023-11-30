'use strict';

const path$c = require('node:path');
const process$1 = require('node:process');
const require$$1 = require('path');
const require$$1$1 = require('crypto');
const fs$i = require('fs');
const require$$0 = require('constants');
const require$$0$1 = require('stream');
const require$$4 = require('util');
const require$$5 = require('assert');
const WebpackSources = require('webpack-sources');
const fs$j = require('node:fs/promises');
const fg = require('fast-glob');
const MagicString = require('magic-string');
const remapping = require('@ampproject/remapping');
require('node:crypto');
const pluginutils = require('@rollup/pluginutils');
const config = require('@unocss/config');
const core = require('@unocss/core');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const path__default = /*#__PURE__*/_interopDefaultCompat(path$c);
const process__default = /*#__PURE__*/_interopDefaultCompat(process$1);
const require$$1__default = /*#__PURE__*/_interopDefaultCompat(require$$1);
const require$$1__default$1 = /*#__PURE__*/_interopDefaultCompat(require$$1$1);
const fs__default = /*#__PURE__*/_interopDefaultCompat(fs$i);
const require$$0__default = /*#__PURE__*/_interopDefaultCompat(require$$0);
const require$$0__default$1 = /*#__PURE__*/_interopDefaultCompat(require$$0$1);
const require$$4__default = /*#__PURE__*/_interopDefaultCompat(require$$4);
const require$$5__default = /*#__PURE__*/_interopDefaultCompat(require$$5);
const WebpackSources__default = /*#__PURE__*/_interopDefaultCompat(WebpackSources);
const fs__default$1 = /*#__PURE__*/_interopDefaultCompat(fs$j);
const fg__default = /*#__PURE__*/_interopDefaultCompat(fg);
const MagicString__default = /*#__PURE__*/_interopDefaultCompat(MagicString);
const remapping__default = /*#__PURE__*/_interopDefaultCompat(remapping);

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var dist = {};

var fs$h = {};

var universalify$1 = {};

universalify$1.fromCallback = function (fn) {
  return Object.defineProperty(function (...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args);
    else {
      return new Promise((resolve, reject) => {
        fn.call(
          this,
          ...args,
          (err, res) => (err != null) ? reject(err) : resolve(res)
        );
      })
    }
  }, 'name', { value: fn.name })
};

universalify$1.fromPromise = function (fn) {
  return Object.defineProperty(function (...args) {
    const cb = args[args.length - 1];
    if (typeof cb !== 'function') return fn.apply(this, args)
    else fn.apply(this, args.slice(0, -1)).then(r => cb(null, r), cb);
  }, 'name', { value: fn.name })
};

var constants = require$$0__default;

var origCwd = process.cwd;
var cwd = null;

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process);
  return cwd
};
try {
  process.cwd();
} catch (er) {}

// This check is needed until node.js 12 is required
if (typeof process.chdir === 'function') {
  var chdir = process.chdir;
  process.chdir = function (d) {
    cwd = null;
    chdir.call(process, d);
  };
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
}

var polyfills$1 = patch$1;

function patch$1 (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs);
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs);
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown);
  fs.fchown = chownFix(fs.fchown);
  fs.lchown = chownFix(fs.lchown);

  fs.chmod = chmodFix(fs.chmod);
  fs.fchmod = chmodFix(fs.fchmod);
  fs.lchmod = chmodFix(fs.lchmod);

  fs.chownSync = chownFixSync(fs.chownSync);
  fs.fchownSync = chownFixSync(fs.fchownSync);
  fs.lchownSync = chownFixSync(fs.lchownSync);

  fs.chmodSync = chmodFixSync(fs.chmodSync);
  fs.fchmodSync = chmodFixSync(fs.fchmodSync);
  fs.lchmodSync = chmodFixSync(fs.lchmodSync);

  fs.stat = statFix(fs.stat);
  fs.fstat = statFix(fs.fstat);
  fs.lstat = statFix(fs.lstat);

  fs.statSync = statFixSync(fs.statSync);
  fs.fstatSync = statFixSync(fs.fstatSync);
  fs.lstatSync = statFixSync(fs.lstatSync);

  // if lchmod/lchown do not exist, then make them no-ops
  if (fs.chmod && !fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchmodSync = function () {};
  }
  if (fs.chown && !fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs.lchownSync = function () {};
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = typeof fs.rename !== 'function' ? fs.rename
    : (function (fs$rename) {
      function rename (from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, function CB (er) {
          if (er
              && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY")
              && Date.now() - start < 60000) {
            setTimeout(function() {
              fs.stat(to, function (stater, st) {
                if (stater && stater.code === "ENOENT")
                  fs$rename(from, to, CB);
                else
                  cb(er);
              });
            }, backoff);
            if (backoff < 100)
              backoff += 10;
            return;
          }
          if (cb) cb(er);
        });
      }
      if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
      return rename
    })(fs.rename);
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = typeof fs.read !== 'function' ? fs.read
  : (function (fs$read) {
    function read (fd, buffer, offset, length, position, callback_) {
      var callback;
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0;
        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++;
            return fs$read.call(fs, fd, buffer, offset, length, position, callback)
          }
          callback_.apply(this, arguments);
        };
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback)
    }

    // This ensures `util.promisify` works as it does for native `fs.read`.
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
    return read
  })(fs.read);

  fs.readSync = typeof fs.readSync !== 'function' ? fs.readSync
  : (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0;
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++;
          continue
        }
        throw er
      }
    }
  }})(fs.readSync);

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err);
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2);
          });
        });
      });
    };

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true;
      var ret;
      try {
        ret = fs.fchmodSync(fd, mode);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd);
          } catch (er) {}
        } else {
          fs.closeSync(fd);
        }
      }
      return ret
    };
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK") && fs.futimes) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er);
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2);
            });
          });
        });
      };

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK);
        var ret;
        var threw = true;
        try {
          ret = fs.futimesSync(fd, at, mt);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd);
            } catch (er) {}
          } else {
            fs.closeSync(fd);
          }
        }
        return ret
      };

    } else if (fs.futimes) {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb); };
      fs.lutimesSync = function () {};
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null;
        if (cb) cb.apply(this, arguments);
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = null;
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000;
          if (stats.gid < 0) stats.gid += 0x100000000;
        }
        if (cb) cb.apply(this, arguments);
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target);
      if (stats) {
        if (stats.uid < 0) stats.uid += 0x100000000;
        if (stats.gid < 0) stats.gid += 0x100000000;
      }
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0;
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}

var Stream = require$$0__default$1.Stream;

var legacyStreams = legacy$1;

function legacy$1 (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    });
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}

var clone_1 = clone$1;

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
};

function clone$1 (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) };
  else
    var copy = Object.create(null);

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });

  return copy
}

var fs$g = fs__default;
var polyfills = polyfills$1;
var legacy = legacyStreams;
var clone = clone_1;

var util$1 = require$$4__default;

/* istanbul ignore next - node 0.x polyfill */
var gracefulQueue;
var previousSymbol;

/* istanbul ignore else - node 0.x polyfill */
if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue');
  // This is used in testing by future versions
  previousSymbol = Symbol.for('graceful-fs.previous');
} else {
  gracefulQueue = '___graceful-fs.queue';
  previousSymbol = '___graceful-fs.previous';
}

function noop () {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue
    }
  });
}

var debug = noop;
if (util$1.debuglog)
  debug = util$1.debuglog('gfs4');
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util$1.format.apply(util$1, arguments);
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
    console.error(m);
  };

// Once time initialization
if (!fs$g[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = commonjsGlobal[gracefulQueue] || [];
  publishQueue(fs$g, queue);

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs$g.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs$g, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          resetQueue();
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments);
      })
    }

    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    });
    return close
  })(fs$g.close);

  fs$g.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs$g, arguments);
      resetQueue();
    }

    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    });
    return closeSync
  })(fs$g.closeSync);

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(fs$g[gracefulQueue]);
      require$$5__default.equal(fs$g[gracefulQueue].length, 0);
    });
  }
}

if (!commonjsGlobal[gracefulQueue]) {
  publishQueue(commonjsGlobal, fs$g[gracefulQueue]);
}

var gracefulFs = patch(clone(fs$g));
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs$g.__patched) {
    gracefulFs = patch(fs$g);
    fs$g.__patched = true;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs);
  fs.gracefulify = patch;

  fs.createReadStream = createReadStream;
  fs.createWriteStream = createWriteStream;
  var fs$readFile = fs.readFile;
  fs.readFile = readFile;
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb, startTime) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile;
  fs.writeFile = writeFile;
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb, startTime) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile;
  if (fs$appendFile)
    fs.appendFile = appendFile;
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb, startTime) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$copyFile = fs.copyFile;
  if (fs$copyFile)
    fs.copyFile = copyFile;
  function copyFile (src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags;
      flags = 0;
    }
    return go$copyFile(src, dest, flags, cb)

    function go$copyFile (src, dest, flags, cb, startTime) {
      return fs$copyFile(src, dest, flags, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$copyFile, [src, dest, flags, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  var fs$readdir = fs.readdir;
  fs.readdir = readdir;
  var noReaddirOptionVersions = /^v[0-5]\./;
  function readdir (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    var go$readdir = noReaddirOptionVersions.test(process.version)
      ? function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, fs$readdirCallback(
          path, options, cb, startTime
        ))
      }
      : function go$readdir (path, options, cb, startTime) {
        return fs$readdir(path, options, fs$readdirCallback(
          path, options, cb, startTime
        ))
      };

    return go$readdir(path, options, cb)

    function fs$readdirCallback (path, options, cb, startTime) {
      return function (err, files) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([
            go$readdir,
            [path, options, cb],
            err,
            startTime || Date.now(),
            Date.now()
          ]);
        else {
          if (files && files.sort)
            files.sort();

          if (typeof cb === 'function')
            cb.call(this, err, files);
        }
      }
    }
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }

  var fs$ReadStream = fs.ReadStream;
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
  }

  var fs$WriteStream = fs.WriteStream;
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
  }

  Object.defineProperty(fs, 'ReadStream', {
    get: function () {
      return ReadStream
    },
    set: function (val) {
      ReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(fs, 'WriteStream', {
    get: function () {
      return WriteStream
    },
    set: function (val) {
      WriteStream = val;
    },
    enumerable: true,
    configurable: true
  });

  // legacy names
  var FileReadStream = ReadStream;
  Object.defineProperty(fs, 'FileReadStream', {
    get: function () {
      return FileReadStream
    },
    set: function (val) {
      FileReadStream = val;
    },
    enumerable: true,
    configurable: true
  });
  var FileWriteStream = WriteStream;
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function () {
      return FileWriteStream
    },
    set: function (val) {
      FileWriteStream = val;
    },
    enumerable: true,
    configurable: true
  });

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy();

        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
        that.read();
      }
    });
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
      }
    });
  }

  function createReadStream (path, options) {
    return new fs.ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new fs.WriteStream(path, options)
  }

  var fs$open = fs.open;
  fs.open = open;
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null;

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb, startTime) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb], err, startTime || Date.now(), Date.now()]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1]);
  fs$g[gracefulQueue].push(elem);
  retry();
}

// keep track of the timeout between retry() calls
var retryTimer;

// reset the startTime and lastTime to now
// this resets the start of the 60 second overall timeout as well as the
// delay between attempts so that we'll retry these jobs sooner
function resetQueue () {
  var now = Date.now();
  for (var i = 0; i < fs$g[gracefulQueue].length; ++i) {
    // entries that are only a length of 2 are from an older version, don't
    // bother modifying those since they'll be retried anyway.
    if (fs$g[gracefulQueue][i].length > 2) {
      fs$g[gracefulQueue][i][3] = now; // startTime
      fs$g[gracefulQueue][i][4] = now; // lastTime
    }
  }
  // call retry to make sure we're actively processing the queue
  retry();
}

function retry () {
  // clear the timer and remove it to help prevent unintended concurrency
  clearTimeout(retryTimer);
  retryTimer = undefined;

  if (fs$g[gracefulQueue].length === 0)
    return

  var elem = fs$g[gracefulQueue].shift();
  var fn = elem[0];
  var args = elem[1];
  // these items may be unset if they were added by an older graceful-fs
  var err = elem[2];
  var startTime = elem[3];
  var lastTime = elem[4];

  // if we don't have a startTime we have no way of knowing if we've waited
  // long enough, so go ahead and retry this item now
  if (startTime === undefined) {
    debug('RETRY', fn.name, args);
    fn.apply(null, args);
  } else if (Date.now() - startTime >= 60000) {
    // it's been more than 60 seconds total, bail now
    debug('TIMEOUT', fn.name, args);
    var cb = args.pop();
    if (typeof cb === 'function')
      cb.call(null, err);
  } else {
    // the amount of time between the last attempt and right now
    var sinceAttempt = Date.now() - lastTime;
    // the amount of time between when we first tried, and when we last tried
    // rounded up to at least 1
    var sinceStart = Math.max(lastTime - startTime, 1);
    // backoff. wait longer than the total time we've been retrying, but only
    // up to a maximum of 100ms
    var desiredDelay = Math.min(sinceStart * 1.2, 100);
    // it's been long enough since the last retry, do it again
    if (sinceAttempt >= desiredDelay) {
      debug('RETRY', fn.name, args);
      fn.apply(null, args.concat([startTime]));
    } else {
      // if we can't do this job yet, push it to the end of the queue
      // and let the next iteration check again
      fs$g[gracefulQueue].push(elem);
    }
  }

  // schedule our next run if one isn't already scheduled
  if (retryTimer === undefined) {
    retryTimer = setTimeout(retry, 0);
  }
}

(function (exports) {
	// This is adapted from https://github.com/normalize/mz
	// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
	const u = universalify$1.fromCallback;
	const fs = gracefulFs;

	const api = [
	  'access',
	  'appendFile',
	  'chmod',
	  'chown',
	  'close',
	  'copyFile',
	  'fchmod',
	  'fchown',
	  'fdatasync',
	  'fstat',
	  'fsync',
	  'ftruncate',
	  'futimes',
	  'lchmod',
	  'lchown',
	  'link',
	  'lstat',
	  'mkdir',
	  'mkdtemp',
	  'open',
	  'opendir',
	  'readdir',
	  'readFile',
	  'readlink',
	  'realpath',
	  'rename',
	  'rm',
	  'rmdir',
	  'stat',
	  'symlink',
	  'truncate',
	  'unlink',
	  'utimes',
	  'writeFile'
	].filter(key => {
	  // Some commands are not available on some systems. Ex:
	  // fs.cp was added in Node.js v16.7.0
	  // fs.lchown is not available on at least some Linux
	  return typeof fs[key] === 'function'
	});

	// Export cloned fs:
	Object.assign(exports, fs);

	// Universalify async methods:
	api.forEach(method => {
	  exports[method] = u(fs[method]);
	});

	// We differ from mz/fs in that we still ship the old, broken, fs.exists()
	// since we are a drop-in replacement for the native module
	exports.exists = function (filename, callback) {
	  if (typeof callback === 'function') {
	    return fs.exists(filename, callback)
	  }
	  return new Promise(resolve => {
	    return fs.exists(filename, resolve)
	  })
	};

	// fs.read(), fs.write(), fs.readv(), & fs.writev() need special treatment due to multiple callback args

	exports.read = function (fd, buffer, offset, length, position, callback) {
	  if (typeof callback === 'function') {
	    return fs.read(fd, buffer, offset, length, position, callback)
	  }
	  return new Promise((resolve, reject) => {
	    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
	      if (err) return reject(err)
	      resolve({ bytesRead, buffer });
	    });
	  })
	};

	// Function signature can be
	// fs.write(fd, buffer[, offset[, length[, position]]], callback)
	// OR
	// fs.write(fd, string[, position[, encoding]], callback)
	// We need to handle both cases, so we use ...args
	exports.write = function (fd, buffer, ...args) {
	  if (typeof args[args.length - 1] === 'function') {
	    return fs.write(fd, buffer, ...args)
	  }

	  return new Promise((resolve, reject) => {
	    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
	      if (err) return reject(err)
	      resolve({ bytesWritten, buffer });
	    });
	  })
	};

	// Function signature is
	// s.readv(fd, buffers[, position], callback)
	// We need to handle the optional arg, so we use ...args
	exports.readv = function (fd, buffers, ...args) {
	  if (typeof args[args.length - 1] === 'function') {
	    return fs.readv(fd, buffers, ...args)
	  }

	  return new Promise((resolve, reject) => {
	    fs.readv(fd, buffers, ...args, (err, bytesRead, buffers) => {
	      if (err) return reject(err)
	      resolve({ bytesRead, buffers });
	    });
	  })
	};

	// Function signature is
	// s.writev(fd, buffers[, position], callback)
	// We need to handle the optional arg, so we use ...args
	exports.writev = function (fd, buffers, ...args) {
	  if (typeof args[args.length - 1] === 'function') {
	    return fs.writev(fd, buffers, ...args)
	  }

	  return new Promise((resolve, reject) => {
	    fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers) => {
	      if (err) return reject(err)
	      resolve({ bytesWritten, buffers });
	    });
	  })
	};

	// fs.realpath.native sometimes not available if fs is monkey-patched
	if (typeof fs.realpath.native === 'function') {
	  exports.realpath.native = u(fs.realpath.native);
	} else {
	  process.emitWarning(
	    'fs.realpath.native is not a function. Is fs being monkey-patched?',
	    'Warning', 'fs-extra-WARN0003'
	  );
	} 
} (fs$h));

var makeDir$1 = {};

var utils$1 = {};

const path$b = require$$1__default;

// https://github.com/nodejs/node/issues/8987
// https://github.com/libuv/libuv/pull/1088
utils$1.checkPath = function checkPath (pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path$b.parse(pth).root, ''));

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`);
      error.code = 'EINVAL';
      throw error
    }
  }
};

const fs$f = fs$h;
const { checkPath } = utils$1;

const getMode = options => {
  const defaults = { mode: 0o777 };
  if (typeof options === 'number') return options
  return ({ ...defaults, ...options }).mode
};

makeDir$1.makeDir = async (dir, options) => {
  checkPath(dir);

  return fs$f.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  })
};

makeDir$1.makeDirSync = (dir, options) => {
  checkPath(dir);

  return fs$f.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  })
};

const u$a = universalify$1.fromPromise;
const { makeDir: _makeDir, makeDirSync } = makeDir$1;
const makeDir = u$a(_makeDir);

var mkdirs$2 = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
};

const u$9 = universalify$1.fromPromise;
const fs$e = fs$h;

function pathExists$6 (path) {
  return fs$e.access(path).then(() => true).catch(() => false)
}

var pathExists_1 = {
  pathExists: u$9(pathExists$6),
  pathExistsSync: fs$e.existsSync
};

const fs$d = gracefulFs;

function utimesMillis$1 (path, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  fs$d.open(path, 'r+', (err, fd) => {
    if (err) return callback(err)
    fs$d.futimes(fd, atime, mtime, futimesErr => {
      fs$d.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr);
      });
    });
  });
}

function utimesMillisSync$1 (path, atime, mtime) {
  const fd = fs$d.openSync(path, 'r+');
  fs$d.futimesSync(fd, atime, mtime);
  return fs$d.closeSync(fd)
}

var utimes = {
  utimesMillis: utimesMillis$1,
  utimesMillisSync: utimesMillisSync$1
};

const fs$c = fs$h;
const path$a = require$$1__default;
const util = require$$4__default;

function getStats$2 (src, dest, opts) {
  const statFunc = opts.dereference
    ? (file) => fs$c.stat(file, { bigint: true })
    : (file) => fs$c.lstat(file, { bigint: true });
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }))
}

function getStatsSync (src, dest, opts) {
  let destStat;
  const statFunc = opts.dereference
    ? (file) => fs$c.statSync(file, { bigint: true })
    : (file) => fs$c.lstatSync(file, { bigint: true });
  const srcStat = statFunc(src);
  try {
    destStat = statFunc(dest);
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

function checkPaths (src, dest, funcName, opts, cb) {
  util.callbackify(getStats$2)(src, dest, opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats;

    if (destStat) {
      if (areIdentical$2(srcStat, destStat)) {
        const srcBaseName = path$a.basename(src);
        const destBaseName = path$a.basename(dest);
        if (funcName === 'move' &&
          srcBaseName !== destBaseName &&
          srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
          return cb(null, { srcStat, destStat, isChangingCase: true })
        }
        return cb(new Error('Source and destination must not be the same.'))
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`))
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`))
      }
    }

    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return cb(null, { srcStat, destStat })
  });
}

function checkPathsSync (src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts);

  if (destStat) {
    if (areIdentical$2(srcStat, destStat)) {
      const srcBaseName = path$a.basename(src);
      const destBaseName = path$a.basename(dest);
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
function checkParentPaths (src, srcStat, dest, funcName, cb) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return cb()
  fs$c.stat(destParent, { bigint: true }, (err, destStat) => {
    if (err) {
      if (err.code === 'ENOENT') return cb()
      return cb(err)
    }
    if (areIdentical$2(srcStat, destStat)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return checkParentPaths(src, srcStat, destParent, funcName, cb)
  });
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path$a.resolve(path$a.dirname(src));
  const destParent = path$a.resolve(path$a.dirname(dest));
  if (destParent === srcParent || destParent === path$a.parse(destParent).root) return
  let destStat;
  try {
    destStat = fs$c.statSync(destParent, { bigint: true });
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (areIdentical$2(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

function areIdentical$2 (srcStat, destStat) {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path$a.resolve(src).split(path$a.sep).filter(i => i);
  const destArr = path$a.resolve(dest).split(path$a.sep).filter(i => i);
  return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

var stat$4 = {
  checkPaths,
  checkPathsSync,
  checkParentPaths,
  checkParentPathsSync,
  isSrcSubdir,
  areIdentical: areIdentical$2
};

const fs$b = gracefulFs;
const path$9 = require$$1__default;
const mkdirs$1 = mkdirs$2.mkdirs;
const pathExists$5 = pathExists_1.pathExists;
const utimesMillis = utimes.utimesMillis;
const stat$3 = stat$4;

function copy$2 (src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts;
    opts = {};
  } else if (typeof opts === 'function') {
    opts = { filter: opts };
  }

  cb = cb || function () {};
  opts = opts || {};

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0001'
    );
  }

  stat$3.checkPaths(src, dest, 'copy', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats;
    stat$3.checkParentPaths(src, srcStat, dest, 'copy', err => {
      if (err) return cb(err)
      runFilter(src, dest, opts, (err, include) => {
        if (err) return cb(err)
        if (!include) return cb()

        checkParentDir(destStat, src, dest, opts, cb);
      });
    });
  });
}

function checkParentDir (destStat, src, dest, opts, cb) {
  const destParent = path$9.dirname(dest);
  pathExists$5(destParent, (err, dirExists) => {
    if (err) return cb(err)
    if (dirExists) return getStats$1(destStat, src, dest, opts, cb)
    mkdirs$1(destParent, err => {
      if (err) return cb(err)
      return getStats$1(destStat, src, dest, opts, cb)
    });
  });
}

function runFilter (src, dest, opts, cb) {
  if (!opts.filter) return cb(null, true)
  Promise.resolve(opts.filter(src, dest))
    .then(include => cb(null, include), error => cb(error));
}

function getStats$1 (destStat, src, dest, opts, cb) {
  const stat = opts.dereference ? fs$b.stat : fs$b.lstat;
  stat(src, (err, srcStat) => {
    if (err) return cb(err)

    if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isFile() ||
             srcStat.isCharacterDevice() ||
             srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts, cb)
    else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src}`))
    else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src}`))
    return cb(new Error(`Unknown file: ${src}`))
  });
}

function onFile$1 (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return copyFile$1(srcStat, src, dest, opts, cb)
  return mayCopyFile$1(srcStat, src, dest, opts, cb)
}

function mayCopyFile$1 (srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    fs$b.unlink(dest, err => {
      if (err) return cb(err)
      return copyFile$1(srcStat, src, dest, opts, cb)
    });
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`))
  } else return cb()
}

function copyFile$1 (srcStat, src, dest, opts, cb) {
  fs$b.copyFile(src, dest, err => {
    if (err) return cb(err)
    if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb)
    return setDestMode$1(dest, srcStat.mode, cb)
  });
}

function handleTimestampsAndMode (srcMode, src, dest, cb) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable$1(srcMode)) {
    return makeFileWritable$1(dest, srcMode, err => {
      if (err) return cb(err)
      return setDestTimestampsAndMode(srcMode, src, dest, cb)
    })
  }
  return setDestTimestampsAndMode(srcMode, src, dest, cb)
}

function fileIsNotWritable$1 (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable$1 (dest, srcMode, cb) {
  return setDestMode$1(dest, srcMode | 0o200, cb)
}

function setDestTimestampsAndMode (srcMode, src, dest, cb) {
  setDestTimestamps$1(src, dest, err => {
    if (err) return cb(err)
    return setDestMode$1(dest, srcMode, cb)
  });
}

function setDestMode$1 (dest, srcMode, cb) {
  return fs$b.chmod(dest, srcMode, cb)
}

function setDestTimestamps$1 (src, dest, cb) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  fs$b.stat(src, (err, updatedSrcStat) => {
    if (err) return cb(err)
    return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb)
  });
}

function onDir$1 (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return mkDirAndCopy$1(srcStat.mode, src, dest, opts, cb)
  return copyDir$1(src, dest, opts, cb)
}

function mkDirAndCopy$1 (srcMode, src, dest, opts, cb) {
  fs$b.mkdir(dest, err => {
    if (err) return cb(err)
    copyDir$1(src, dest, opts, err => {
      if (err) return cb(err)
      return setDestMode$1(dest, srcMode, cb)
    });
  });
}

function copyDir$1 (src, dest, opts, cb) {
  fs$b.readdir(src, (err, items) => {
    if (err) return cb(err)
    return copyDirItems(items, src, dest, opts, cb)
  });
}

function copyDirItems (items, src, dest, opts, cb) {
  const item = items.pop();
  if (!item) return cb()
  return copyDirItem$1(items, item, src, dest, opts, cb)
}

function copyDirItem$1 (items, item, src, dest, opts, cb) {
  const srcItem = path$9.join(src, item);
  const destItem = path$9.join(dest, item);
  runFilter(srcItem, destItem, opts, (err, include) => {
    if (err) return cb(err)
    if (!include) return copyDirItems(items, src, dest, opts, cb)

    stat$3.checkPaths(srcItem, destItem, 'copy', opts, (err, stats) => {
      if (err) return cb(err)
      const { destStat } = stats;
      getStats$1(destStat, srcItem, destItem, opts, err => {
        if (err) return cb(err)
        return copyDirItems(items, src, dest, opts, cb)
      });
    });
  });
}

function onLink$1 (destStat, src, dest, opts, cb) {
  fs$b.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err)
    if (opts.dereference) {
      resolvedSrc = path$9.resolve(process.cwd(), resolvedSrc);
    }

    if (!destStat) {
      return fs$b.symlink(resolvedSrc, dest, cb)
    } else {
      fs$b.readlink(dest, (err, resolvedDest) => {
        if (err) {
          // dest exists and is a regular file or directory,
          // Windows may throw UNKNOWN error. If dest already exists,
          // fs throws error anyway, so no need to guard against it here.
          if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs$b.symlink(resolvedSrc, dest, cb)
          return cb(err)
        }
        if (opts.dereference) {
          resolvedDest = path$9.resolve(process.cwd(), resolvedDest);
        }
        if (stat$3.isSrcSubdir(resolvedSrc, resolvedDest)) {
          return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`))
        }

        // do not copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.
        if (stat$3.isSrcSubdir(resolvedDest, resolvedSrc)) {
          return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`))
        }
        return copyLink$1(resolvedSrc, dest, cb)
      });
    }
  });
}

function copyLink$1 (resolvedSrc, dest, cb) {
  fs$b.unlink(dest, err => {
    if (err) return cb(err)
    return fs$b.symlink(resolvedSrc, dest, cb)
  });
}

var copy_1 = copy$2;

const fs$a = gracefulFs;
const path$8 = require$$1__default;
const mkdirsSync$1 = mkdirs$2.mkdirsSync;
const utimesMillisSync = utimes.utimesMillisSync;
const stat$2 = stat$4;

function copySync$1 (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts };
  }

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    process.emitWarning(
      'Using the preserveTimestamps option in 32-bit node is not recommended;\n\n' +
      '\tsee https://github.com/jprichardson/node-fs-extra/issues/269',
      'Warning', 'fs-extra-WARN0002'
    );
  }

  const { srcStat, destStat } = stat$2.checkPathsSync(src, dest, 'copy', opts);
  stat$2.checkParentPathsSync(src, srcStat, dest, 'copy');
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path$8.dirname(dest);
  if (!fs$a.existsSync(destParent)) mkdirsSync$1(destParent);
  return getStats(destStat, src, dest, opts)
}

function getStats (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs$a.statSync : fs$a.lstatSync;
  const srcStat = statSync(src);

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)
  return mayCopyFile(srcStat, src, dest, opts)
}

function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs$a.unlinkSync(dest);
    return copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile (srcStat, src, dest, opts) {
  fs$a.copyFileSync(src, dest);
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
  return setDestMode(dest, srcStat.mode)
}

function handleTimestamps (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
  return setDestTimestamps(src, dest)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return setDestMode(dest, srcMode | 0o200)
}

function setDestMode (dest, srcMode) {
  return fs$a.chmodSync(dest, srcMode)
}

function setDestTimestamps (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = fs$a.statSync(src);
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts)
  return copyDir(src, dest, opts)
}

function mkDirAndCopy (srcMode, src, dest, opts) {
  fs$a.mkdirSync(dest);
  copyDir(src, dest, opts);
  return setDestMode(dest, srcMode)
}

function copyDir (src, dest, opts) {
  fs$a.readdirSync(src).forEach(item => copyDirItem(item, src, dest, opts));
}

function copyDirItem (item, src, dest, opts) {
  const srcItem = path$8.join(src, item);
  const destItem = path$8.join(dest, item);
  if (opts.filter && !opts.filter(srcItem, destItem)) return
  const { destStat } = stat$2.checkPathsSync(srcItem, destItem, 'copy', opts);
  return getStats(destStat, srcItem, destItem, opts)
}

function onLink (destStat, src, dest, opts) {
  let resolvedSrc = fs$a.readlinkSync(src);
  if (opts.dereference) {
    resolvedSrc = path$8.resolve(process.cwd(), resolvedSrc);
  }

  if (!destStat) {
    return fs$a.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest;
    try {
      resolvedDest = fs$a.readlinkSync(dest);
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs$a.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path$8.resolve(process.cwd(), resolvedDest);
    }
    if (stat$2.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (stat$2.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
    return copyLink(resolvedSrc, dest)
  }
}

function copyLink (resolvedSrc, dest) {
  fs$a.unlinkSync(dest);
  return fs$a.symlinkSync(resolvedSrc, dest)
}

var copySync_1 = copySync$1;

const u$8 = universalify$1.fromCallback;
var copy$1 = {
  copy: u$8(copy_1),
  copySync: copySync_1
};

const fs$9 = gracefulFs;
const u$7 = universalify$1.fromCallback;

function remove$2 (path, callback) {
  fs$9.rm(path, { recursive: true, force: true }, callback);
}

function removeSync$1 (path) {
  fs$9.rmSync(path, { recursive: true, force: true });
}

var remove_1 = {
  remove: u$7(remove$2),
  removeSync: removeSync$1
};

const u$6 = universalify$1.fromPromise;
const fs$8 = fs$h;
const path$7 = require$$1__default;
const mkdir$3 = mkdirs$2;
const remove$1 = remove_1;

const emptyDir = u$6(async function emptyDir (dir) {
  let items;
  try {
    items = await fs$8.readdir(dir);
  } catch {
    return mkdir$3.mkdirs(dir)
  }

  return Promise.all(items.map(item => remove$1.remove(path$7.join(dir, item))))
});

function emptyDirSync (dir) {
  let items;
  try {
    items = fs$8.readdirSync(dir);
  } catch {
    return mkdir$3.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path$7.join(dir, item);
    remove$1.removeSync(item);
  });
}

var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};

const u$5 = universalify$1.fromCallback;
const path$6 = require$$1__default;
const fs$7 = gracefulFs;
const mkdir$2 = mkdirs$2;

function createFile$1 (file, callback) {
  function makeFile () {
    fs$7.writeFile(file, '', err => {
      if (err) return callback(err)
      callback();
    });
  }

  fs$7.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback()
    const dir = path$6.dirname(file);
    fs$7.stat(dir, (err, stats) => {
      if (err) {
        // if the directory doesn't exist, make it
        if (err.code === 'ENOENT') {
          return mkdir$2.mkdirs(dir, err => {
            if (err) return callback(err)
            makeFile();
          })
        }
        return callback(err)
      }

      if (stats.isDirectory()) makeFile();
      else {
        // parent is not a directory
        // This is just to cause an internal ENOTDIR error to be thrown
        fs$7.readdir(dir, err => {
          if (err) return callback(err)
        });
      }
    });
  });
}

function createFileSync$1 (file) {
  let stats;
  try {
    stats = fs$7.statSync(file);
  } catch {}
  if (stats && stats.isFile()) return

  const dir = path$6.dirname(file);
  try {
    if (!fs$7.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs$7.readdirSync(dir);
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir$2.mkdirsSync(dir);
    else throw err
  }

  fs$7.writeFileSync(file, '');
}

var file = {
  createFile: u$5(createFile$1),
  createFileSync: createFileSync$1
};

const u$4 = universalify$1.fromCallback;
const path$5 = require$$1__default;
const fs$6 = gracefulFs;
const mkdir$1 = mkdirs$2;
const pathExists$4 = pathExists_1.pathExists;
const { areIdentical: areIdentical$1 } = stat$4;

function createLink$1 (srcpath, dstpath, callback) {
  function makeLink (srcpath, dstpath) {
    fs$6.link(srcpath, dstpath, err => {
      if (err) return callback(err)
      callback(null);
    });
  }

  fs$6.lstat(dstpath, (_, dstStat) => {
    fs$6.lstat(srcpath, (err, srcStat) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink');
        return callback(err)
      }
      if (dstStat && areIdentical$1(srcStat, dstStat)) return callback(null)

      const dir = path$5.dirname(dstpath);
      pathExists$4(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return makeLink(srcpath, dstpath)
        mkdir$1.mkdirs(dir, err => {
          if (err) return callback(err)
          makeLink(srcpath, dstpath);
        });
      });
    });
  });
}

function createLinkSync$1 (srcpath, dstpath) {
  let dstStat;
  try {
    dstStat = fs$6.lstatSync(dstpath);
  } catch {}

  try {
    const srcStat = fs$6.lstatSync(srcpath);
    if (dstStat && areIdentical$1(srcStat, dstStat)) return
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err
  }

  const dir = path$5.dirname(dstpath);
  const dirExists = fs$6.existsSync(dir);
  if (dirExists) return fs$6.linkSync(srcpath, dstpath)
  mkdir$1.mkdirsSync(dir);

  return fs$6.linkSync(srcpath, dstpath)
}

var link = {
  createLink: u$4(createLink$1),
  createLinkSync: createLinkSync$1
};

const path$4 = require$$1__default;
const fs$5 = gracefulFs;
const pathExists$3 = pathExists_1.pathExists;

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

function symlinkPaths$1 (srcpath, dstpath, callback) {
  if (path$4.isAbsolute(srcpath)) {
    return fs$5.lstat(srcpath, (err) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink');
        return callback(err)
      }
      return callback(null, {
        toCwd: srcpath,
        toDst: srcpath
      })
    })
  } else {
    const dstdir = path$4.dirname(dstpath);
    const relativeToDst = path$4.join(dstdir, srcpath);
    return pathExists$3(relativeToDst, (err, exists) => {
      if (err) return callback(err)
      if (exists) {
        return callback(null, {
          toCwd: relativeToDst,
          toDst: srcpath
        })
      } else {
        return fs$5.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink');
            return callback(err)
          }
          return callback(null, {
            toCwd: srcpath,
            toDst: path$4.relative(dstdir, srcpath)
          })
        })
      }
    })
  }
}

function symlinkPathsSync$1 (srcpath, dstpath) {
  let exists;
  if (path$4.isAbsolute(srcpath)) {
    exists = fs$5.existsSync(srcpath);
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  } else {
    const dstdir = path$4.dirname(dstpath);
    const relativeToDst = path$4.join(dstdir, srcpath);
    exists = fs$5.existsSync(relativeToDst);
    if (exists) {
      return {
        toCwd: relativeToDst,
        toDst: srcpath
      }
    } else {
      exists = fs$5.existsSync(srcpath);
      if (!exists) throw new Error('relative srcpath does not exist')
      return {
        toCwd: srcpath,
        toDst: path$4.relative(dstdir, srcpath)
      }
    }
  }
}

var symlinkPaths_1 = {
  symlinkPaths: symlinkPaths$1,
  symlinkPathsSync: symlinkPathsSync$1
};

const fs$4 = gracefulFs;

function symlinkType$1 (srcpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback;
  type = (typeof type === 'function') ? false : type;
  if (type) return callback(null, type)
  fs$4.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file')
    type = (stats && stats.isDirectory()) ? 'dir' : 'file';
    callback(null, type);
  });
}

function symlinkTypeSync$1 (srcpath, type) {
  let stats;

  if (type) return type
  try {
    stats = fs$4.lstatSync(srcpath);
  } catch {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

var symlinkType_1 = {
  symlinkType: symlinkType$1,
  symlinkTypeSync: symlinkTypeSync$1
};

const u$3 = universalify$1.fromCallback;
const path$3 = require$$1__default;
const fs$3 = fs$h;
const _mkdirs = mkdirs$2;
const mkdirs = _mkdirs.mkdirs;
const mkdirsSync = _mkdirs.mkdirsSync;

const _symlinkPaths = symlinkPaths_1;
const symlinkPaths = _symlinkPaths.symlinkPaths;
const symlinkPathsSync = _symlinkPaths.symlinkPathsSync;

const _symlinkType = symlinkType_1;
const symlinkType = _symlinkType.symlinkType;
const symlinkTypeSync = _symlinkType.symlinkTypeSync;

const pathExists$2 = pathExists_1.pathExists;

const { areIdentical } = stat$4;

function createSymlink$1 (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback;
  type = (typeof type === 'function') ? false : type;

  fs$3.lstat(dstpath, (err, stats) => {
    if (!err && stats.isSymbolicLink()) {
      Promise.all([
        fs$3.stat(srcpath),
        fs$3.stat(dstpath)
      ]).then(([srcStat, dstStat]) => {
        if (areIdentical(srcStat, dstStat)) return callback(null)
        _createSymlink(srcpath, dstpath, type, callback);
      });
    } else _createSymlink(srcpath, dstpath, type, callback);
  });
}

function _createSymlink (srcpath, dstpath, type, callback) {
  symlinkPaths(srcpath, dstpath, (err, relative) => {
    if (err) return callback(err)
    srcpath = relative.toDst;
    symlinkType(relative.toCwd, type, (err, type) => {
      if (err) return callback(err)
      const dir = path$3.dirname(dstpath);
      pathExists$2(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return fs$3.symlink(srcpath, dstpath, type, callback)
        mkdirs(dir, err => {
          if (err) return callback(err)
          fs$3.symlink(srcpath, dstpath, type, callback);
        });
      });
    });
  });
}

function createSymlinkSync$1 (srcpath, dstpath, type) {
  let stats;
  try {
    stats = fs$3.lstatSync(dstpath);
  } catch {}
  if (stats && stats.isSymbolicLink()) {
    const srcStat = fs$3.statSync(srcpath);
    const dstStat = fs$3.statSync(dstpath);
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = symlinkPathsSync(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync(relative.toCwd, type);
  const dir = path$3.dirname(dstpath);
  const exists = fs$3.existsSync(dir);
  if (exists) return fs$3.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir);
  return fs$3.symlinkSync(srcpath, dstpath, type)
}

var symlink = {
  createSymlink: u$3(createSymlink$1),
  createSymlinkSync: createSymlinkSync$1
};

const { createFile, createFileSync } = file;
const { createLink, createLinkSync } = link;
const { createSymlink, createSymlinkSync } = symlink;

var ensure = {
  // file
  createFile,
  createFileSync,
  ensureFile: createFile,
  ensureFileSync: createFileSync,
  // link
  createLink,
  createLinkSync,
  ensureLink: createLink,
  ensureLinkSync: createLinkSync,
  // symlink
  createSymlink,
  createSymlinkSync,
  ensureSymlink: createSymlink,
  ensureSymlinkSync: createSymlinkSync
};

function stringify$3 (obj, { EOL = '\n', finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : '';
  const str = JSON.stringify(obj, replacer, spaces);

  return str.replace(/\n/g, EOL) + EOF
}

function stripBom$1 (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8');
  return content.replace(/^\uFEFF/, '')
}

var utils = { stringify: stringify$3, stripBom: stripBom$1 };

let _fs;
try {
  _fs = gracefulFs;
} catch (_) {
  _fs = fs__default;
}
const universalify = universalify$1;
const { stringify: stringify$2, stripBom } = utils;

async function _readFile (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options };
  }

  const fs = options.fs || _fs;

  const shouldThrow = 'throws' in options ? options.throws : true;

  let data = await universalify.fromCallback(fs.readFile)(file, options);

  data = stripBom(data);

  let obj;
  try {
    obj = JSON.parse(data, options ? options.reviver : null);
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err
    } else {
      return null
    }
  }

  return obj
}

const readFile = universalify.fromPromise(_readFile);

function readFileSync (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options };
  }

  const fs = options.fs || _fs;

  const shouldThrow = 'throws' in options ? options.throws : true;

  try {
    let content = fs.readFileSync(file, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`;
      throw err
    } else {
      return null
    }
  }
}

async function _writeFile (file, obj, options = {}) {
  const fs = options.fs || _fs;

  const str = stringify$2(obj, options);

  await universalify.fromCallback(fs.writeFile)(file, str, options);
}

const writeFile = universalify.fromPromise(_writeFile);

function writeFileSync (file, obj, options = {}) {
  const fs = options.fs || _fs;

  const str = stringify$2(obj, options);
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

const jsonfile$1 = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
};

var jsonfile_1 = jsonfile$1;

const jsonFile$1 = jsonfile_1;

var jsonfile = {
  // jsonfile exports
  readJson: jsonFile$1.readFile,
  readJsonSync: jsonFile$1.readFileSync,
  writeJson: jsonFile$1.writeFile,
  writeJsonSync: jsonFile$1.writeFileSync
};

const u$2 = universalify$1.fromCallback;
const fs$2 = gracefulFs;
const path$2 = require$$1__default;
const mkdir = mkdirs$2;
const pathExists$1 = pathExists_1.pathExists;

function outputFile$1 (file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding;
    encoding = 'utf8';
  }

  const dir = path$2.dirname(file);
  pathExists$1(dir, (err, itDoes) => {
    if (err) return callback(err)
    if (itDoes) return fs$2.writeFile(file, data, encoding, callback)

    mkdir.mkdirs(dir, err => {
      if (err) return callback(err)

      fs$2.writeFile(file, data, encoding, callback);
    });
  });
}

function outputFileSync$1 (file, ...args) {
  const dir = path$2.dirname(file);
  if (fs$2.existsSync(dir)) {
    return fs$2.writeFileSync(file, ...args)
  }
  mkdir.mkdirsSync(dir);
  fs$2.writeFileSync(file, ...args);
}

var outputFile_1 = {
  outputFile: u$2(outputFile$1),
  outputFileSync: outputFileSync$1
};

const { stringify: stringify$1 } = utils;
const { outputFile } = outputFile_1;

async function outputJson (file, data, options = {}) {
  const str = stringify$1(data, options);

  await outputFile(file, str, options);
}

var outputJson_1 = outputJson;

const { stringify } = utils;
const { outputFileSync } = outputFile_1;

function outputJsonSync (file, data, options) {
  const str = stringify(data, options);

  outputFileSync(file, str, options);
}

var outputJsonSync_1 = outputJsonSync;

const u$1 = universalify$1.fromPromise;
const jsonFile = jsonfile;

jsonFile.outputJson = u$1(outputJson_1);
jsonFile.outputJsonSync = outputJsonSync_1;
// aliases
jsonFile.outputJSON = jsonFile.outputJson;
jsonFile.outputJSONSync = jsonFile.outputJsonSync;
jsonFile.writeJSON = jsonFile.writeJson;
jsonFile.writeJSONSync = jsonFile.writeJsonSync;
jsonFile.readJSON = jsonFile.readJson;
jsonFile.readJSONSync = jsonFile.readJsonSync;

var json = jsonFile;

const fs$1 = gracefulFs;
const path$1 = require$$1__default;
const copy = copy$1.copy;
const remove = remove_1.remove;
const mkdirp = mkdirs$2.mkdirp;
const pathExists = pathExists_1.pathExists;
const stat$1 = stat$4;

function move$1 (src, dest, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts = opts || {};

  const overwrite = opts.overwrite || opts.clobber || false;

  stat$1.checkPaths(src, dest, 'move', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, isChangingCase = false } = stats;
    stat$1.checkParentPaths(src, srcStat, dest, 'move', err => {
      if (err) return cb(err)
      if (isParentRoot$1(dest)) return doRename$1(src, dest, overwrite, isChangingCase, cb)
      mkdirp(path$1.dirname(dest), err => {
        if (err) return cb(err)
        return doRename$1(src, dest, overwrite, isChangingCase, cb)
      });
    });
  });
}

function isParentRoot$1 (dest) {
  const parent = path$1.dirname(dest);
  const parsedPath = path$1.parse(parent);
  return parsedPath.root === parent
}

function doRename$1 (src, dest, overwrite, isChangingCase, cb) {
  if (isChangingCase) return rename$1(src, dest, overwrite, cb)
  if (overwrite) {
    return remove(dest, err => {
      if (err) return cb(err)
      return rename$1(src, dest, overwrite, cb)
    })
  }
  pathExists(dest, (err, destExists) => {
    if (err) return cb(err)
    if (destExists) return cb(new Error('dest already exists.'))
    return rename$1(src, dest, overwrite, cb)
  });
}

function rename$1 (src, dest, overwrite, cb) {
  fs$1.rename(src, dest, err => {
    if (!err) return cb()
    if (err.code !== 'EXDEV') return cb(err)
    return moveAcrossDevice$1(src, dest, overwrite, cb)
  });
}

function moveAcrossDevice$1 (src, dest, overwrite, cb) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  copy(src, dest, opts, err => {
    if (err) return cb(err)
    return remove(src, cb)
  });
}

var move_1 = move$1;

const fs = gracefulFs;
const path = require$$1__default;
const copySync = copy$1.copySync;
const removeSync = remove_1.removeSync;
const mkdirpSync = mkdirs$2.mkdirpSync;
const stat = stat$4;

function moveSync (src, dest, opts) {
  opts = opts || {};
  const overwrite = opts.overwrite || opts.clobber || false;

  const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, 'move', opts);
  stat.checkParentPathsSync(src, srcStat, dest, 'move');
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest));
  return doRename(src, dest, overwrite, isChangingCase)
}

function isParentRoot (dest) {
  const parent = path.dirname(dest);
  const parsedPath = path.parse(parent);
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite)
  if (overwrite) {
    removeSync(dest);
    return rename(src, dest, overwrite)
  }
  if (fs.existsSync(dest)) throw new Error('dest already exists.')
  return rename(src, dest, overwrite)
}

function rename (src, dest, overwrite) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice(src, dest, overwrite)
  }
}

function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true,
    preserveTimestamps: true
  };
  copySync(src, dest, opts);
  return removeSync(src)
}

var moveSync_1 = moveSync;

const u = universalify$1.fromCallback;
var move = {
  move: u(move_1),
  moveSync: moveSync_1
};

var lib = {
  // Export promiseified graceful-fs:
  ...fs$h,
  // Export extra methods:
  ...copy$1,
  ...empty,
  ...ensure,
  ...json,
  ...mkdirs$2,
  ...move,
  ...outputFile_1,
  ...pathExists_1,
  ...remove_1
};

var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (commonjsGlobal && commonjsGlobal.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (commonjsGlobal && commonjsGlobal.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (commonjsGlobal && commonjsGlobal.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _RspackVirtualModulePlugin_instances, _RspackVirtualModulePlugin_staticModules, _RspackVirtualModulePlugin_tempDir, _RspackVirtualModulePlugin_normalizePath;
Object.defineProperty(dist, "__esModule", { value: true });
var RspackVirtualModulePlugin_1 = dist.RspackVirtualModulePlugin = void 0;
const path_1 = __importStar(require$$1__default);
const crypto_1 = __importDefault(require$$1__default$1);
const fs_extra_1 = __importDefault(lib);
class RspackVirtualModulePlugin {
    constructor(staticModules, tempDir) {
        _RspackVirtualModulePlugin_instances.add(this);
        _RspackVirtualModulePlugin_staticModules.set(this, void 0);
        _RspackVirtualModulePlugin_tempDir.set(this, void 0);
        __classPrivateFieldSet(this, _RspackVirtualModulePlugin_staticModules, staticModules, "f");
        const nodeModulesDir = (0, path_1.join)(process.cwd(), 'node_modules');
        if (!fs_extra_1.default.existsSync(nodeModulesDir)) {
            fs_extra_1.default.mkdirSync(nodeModulesDir);
        }
        if (!tempDir) {
            const hash = crypto_1.default
                .createHash('md5')
                .update(JSON.stringify(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")))
                .digest('hex')
                .slice(0, 8);
            __classPrivateFieldSet(this, _RspackVirtualModulePlugin_tempDir, path_1.default.join(nodeModulesDir, `rspack-virtual-module-${hash}`), "f");
        }
        else {
            __classPrivateFieldSet(this, _RspackVirtualModulePlugin_tempDir, path_1.default.join(nodeModulesDir, tempDir), "f");
        }
        if (!fs_extra_1.default.existsSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"))) {
            fs_extra_1.default.mkdirSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"));
        }
    }
    apply(compiler) {
        // Write the modules to the disk
        Object.entries(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")).forEach(([path, content]) => {
            fs_extra_1.default.writeFileSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_instances, "m", _RspackVirtualModulePlugin_normalizePath).call(this, path), content);
        });
        const originalResolveModulesDir = compiler.options.resolve.modules || [
            'node_modules',
        ];
        compiler.options.resolve.modules = [
            ...originalResolveModulesDir,
            __classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"),
        ];
        compiler.options.resolve.alias = Object.assign(Object.assign({}, compiler.options.resolve.alias), Object.keys(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")).reduce((acc, p) => {
            acc[p] = __classPrivateFieldGet(this, _RspackVirtualModulePlugin_instances, "m", _RspackVirtualModulePlugin_normalizePath).call(this, p);
            return acc;
        }, {}));
        process.on('exit', this.clear.bind(this));
    }
    writeModule(path, content) {
        const normalizedPath = __classPrivateFieldGet(this, _RspackVirtualModulePlugin_instances, "m", _RspackVirtualModulePlugin_normalizePath).call(this, path);
        fs_extra_1.default.ensureDirSync((0, path_1.dirname)(normalizedPath));
        fs_extra_1.default.writeFileSync(normalizedPath, content);
    }
    clear() {
        fs_extra_1.default.removeSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"));
    }
}
RspackVirtualModulePlugin_1 = dist.RspackVirtualModulePlugin = RspackVirtualModulePlugin;
_RspackVirtualModulePlugin_staticModules = new WeakMap(), _RspackVirtualModulePlugin_tempDir = new WeakMap(), _RspackVirtualModulePlugin_instances = new WeakSet(), _RspackVirtualModulePlugin_normalizePath = function _RspackVirtualModulePlugin_normalizePath(p) {
    const ext = (0, path_1.extname)(p);
    return (0, path_1.join)(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"), ext ? p : `${p}.js`);
};
dist.default = RspackVirtualModulePlugin;

const INCLUDE_COMMENT = "@unocss-include";
const IGNORE_COMMENT = "@unocss-ignore";
const CSS_PLACEHOLDER = "@unocss-placeholder";
const SKIP_START_COMMENT = "@unocss-skip-start";
const SKIP_END_COMMENT = "@unocss-skip-end";
const SKIP_COMMENT_RE = new RegExp(`(//\\s*?${SKIP_START_COMMENT}\\s*?|\\/\\*\\s*?${SKIP_START_COMMENT}\\s*?\\*\\/|<!--\\s*?${SKIP_START_COMMENT}\\s*?-->)[\\s\\S]*?(//\\s*?${SKIP_END_COMMENT}\\s*?|\\/\\*\\s*?${SKIP_END_COMMENT}\\s*?\\*\\/|<!--\\s*?${SKIP_END_COMMENT}\\s*?-->)`, "g");

function hash(str) {
  let i;
  let l;
  let hval = 2166136261;
  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return `00000${(hval >>> 0).toString(36)}`.slice(-6);
}

async function applyTransformers(ctx, original, id, enforce = "default") {
  if (original.includes(IGNORE_COMMENT))
    return;
  const transformers = (ctx.uno.config.transformers || []).filter((i) => (i.enforce || "default") === enforce);
  if (!transformers.length)
    return;
  const skipMap = /* @__PURE__ */ new Map();
  let code = original;
  let s = new MagicString__default(transformSkipCode(code, skipMap));
  const maps = [];
  for (const t of transformers) {
    if (t.idFilter) {
      if (!t.idFilter(id))
        continue;
    } else if (!ctx.filter(code, id)) {
      continue;
    }
    await t.transform(s, id, ctx);
    if (s.hasChanged()) {
      code = restoreSkipCode(s.toString(), skipMap);
      maps.push(s.generateMap({ hires: true, source: id }));
      s = new MagicString__default(code);
    }
  }
  if (code !== original) {
    ctx.affectedModules.add(id);
    return {
      code,
      map: remapping__default(maps, () => null)
    };
  }
}
function transformSkipCode(code, map) {
  for (const item of Array.from(code.matchAll(SKIP_COMMENT_RE))) {
    if (item != null) {
      const matched = item[0];
      const withHashKey = `@unocss-skip-placeholder-${hash(matched)}`;
      map.set(withHashKey, matched);
      code = code.replace(matched, withHashKey);
    }
  }
  return code;
}
function restoreSkipCode(code, map) {
  for (const [withHashKey, matched] of map.entries())
    code = code.replace(withHashKey, matched);
  return code;
}

async function setupContentExtractor(ctx, shouldWatch = false) {
  const { content } = await ctx.getConfig();
  const { extract, tasks, root, filter } = ctx;
  if (content?.inline) {
    await Promise.all(
      content.inline.map(async (c, idx) => {
        if (typeof c === "function")
          c = await c();
        if (typeof c === "string")
          c = { code: c };
        return extract(c.code, c.id ?? `__plain_content_${idx}__`);
      })
    );
  }
  if (content?.filesystem) {
    const files = await fg__default(content.filesystem, { cwd: root });
    async function extractFile(file) {
      file = path$c.isAbsolute(file) ? file : path$c.resolve(root, file);
      const code = await fs__default$1.readFile(file, "utf-8");
      if (!filter(code, file))
        return;
      const preTransform = await applyTransformers(ctx, code, file, "pre");
      const defaultTransform = await applyTransformers(
        ctx,
        preTransform?.code || code,
        file
      );
      await applyTransformers(
        ctx,
        defaultTransform?.code || preTransform?.code || code,
        file,
        "post"
      );
      return await extract(preTransform?.code || code, file);
    }
    if (shouldWatch) {
      const { watch } = await import('chokidar');
      const ignored = ["**/{.git,node_modules}/**"];
      const watcher = watch(files, {
        ignorePermissionErrors: true,
        ignored,
        cwd: root,
        ignoreInitial: true
      });
      watcher.on("all", (type, file) => {
        if (type === "add" || type === "change") {
          const absolutePath = path$c.resolve(root, file);
          console.log("type", type, absolutePath);
          tasks.push(extractFile(absolutePath));
        }
      });
    }
    await Promise.all(files.map(extractFile));
  }
}

const defaultPipelineExclude = [core.cssIdRE];
const defaultPipelineInclude = [/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/];

function deprecationCheck(config) {
  let warned = false;
  function warn(msg) {
    warned = true;
    console.warn(`[unocss] ${msg}`);
  }
  if (config.include)
    warn("`include` option is deprecated, use `content.pipeline.include` instead.");
  if (config.exclude)
    warn("`exclude` option is deprecated, use `content.pipeline.exclude` instead.");
  if (config.extraContent)
    warn("`extraContent` option is deprecated, use `content` instead.");
  if (config.content?.plain)
    warn("`content.plain` option is renamed to `content.inline`.");
  if (warned && typeof process !== "undefined" && process.env.CI)
    throw new Error("deprecation warning");
}

function createContext(configOrPath, defaults = {}, extraConfigSources = [], resolveConfigResult = () => {
}) {
  let root = process__default.cwd();
  let rawConfig = {};
  let configFileList = [];
  const uno = core.createGenerator(rawConfig, defaults);
  let rollupFilter = pluginutils.createFilter(defaultPipelineInclude, defaultPipelineExclude);
  const invalidations = [];
  const reloadListeners = [];
  const modules = new core.BetterMap();
  const tokens = /* @__PURE__ */ new Set();
  const tasks = [];
  const affectedModules = /* @__PURE__ */ new Set();
  let ready = reloadConfig();
  async function reloadConfig() {
    const result = await config.loadConfig(root, configOrPath, extraConfigSources, defaults);
    resolveConfigResult(result);
    deprecationCheck(result.config);
    rawConfig = result.config;
    configFileList = result.sources;
    uno.setConfig(rawConfig);
    uno.config.envMode = "dev";
    rollupFilter = rawConfig.content?.pipeline === false ? () => false : pluginutils.createFilter(
      rawConfig.content?.pipeline?.include || rawConfig.include || defaultPipelineInclude,
      rawConfig.content?.pipeline?.exclude || rawConfig.exclude || defaultPipelineExclude
    );
    tokens.clear();
    await Promise.all(modules.map((code, id) => uno.applyExtractors(code.replace(SKIP_COMMENT_RE, ""), id, tokens)));
    invalidate();
    dispatchReload();
    const presets = /* @__PURE__ */ new Set();
    uno.config.presets.forEach((i) => {
      if (!i.name)
        return;
      if (presets.has(i.name))
        console.warn(`[unocss] duplication of preset ${i.name} found, there might be something wrong with your config.`);
      else
        presets.add(i.name);
    });
    return result;
  }
  async function updateRoot(newRoot) {
    if (newRoot !== root) {
      root = newRoot;
      ready = reloadConfig();
    }
    return await ready;
  }
  function invalidate() {
    invalidations.forEach((cb) => cb());
  }
  function dispatchReload() {
    reloadListeners.forEach((cb) => cb());
  }
  async function extract(code, id) {
    if (id)
      modules.set(id, code);
    const len = tokens.size;
    await uno.applyExtractors(code.replace(SKIP_COMMENT_RE, ""), id, tokens);
    if (tokens.size > len)
      invalidate();
  }
  function filter(code, id) {
    if (code.includes(IGNORE_COMMENT))
      return false;
    return code.includes(INCLUDE_COMMENT) || code.includes(CSS_PLACEHOLDER) || rollupFilter(id.replace(/\?v=\w+$/, ""));
  }
  async function getConfig() {
    await ready;
    return rawConfig;
  }
  async function flushTasks() {
    const _tasks = [...tasks];
    await Promise.all(_tasks);
    tasks.splice(0, _tasks.length);
  }
  return {
    get ready() {
      return ready;
    },
    tokens,
    modules,
    affectedModules,
    tasks,
    flushTasks,
    invalidate,
    onInvalidate(fn) {
      invalidations.push(fn);
    },
    filter,
    reloadConfig,
    onReload(fn) {
      reloadListeners.push(fn);
    },
    uno,
    extract,
    getConfig,
    get root() {
      return root;
    },
    updateRoot,
    getConfigFileList: () => configFileList
  };
}

const LAYER_MARK_ALL = "__ALL__";
const LAYER_PLACEHOLDER_RE = /(\\?")?#--unocss--\s*{\s*layer\s*:\s*(.+?);?\s*}/g;
function getLayerPlaceholder(layer) {
  return `#--unocss--{layer:${layer}}`;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const PLUGIN_NAME = "UnocssRspackPlugin";
class UnocssRspackPlugin {
  constructor(options) {
    __publicField(this, "options");
    __publicField(this, "LOADER_PATH", path__default.resolve(__dirname, "./loader.js"));
    this.options = {
      layerHyphen: ".",
      ...options
    };
    this.ensureLoader();
  }
  get RE() {
    return new RegExp(`^uno(?:\\${this.options.layerHyphen}(.+))?.css$`);
  }
  ensureLoader() {
    if (!fs__default.existsSync(this.LOADER_PATH)) {
      fs__default.writeFileSync(
        this.LOADER_PATH,
        "async function loader(t,e){const s=this.async(),i=this.resource,{exec:n}=this.getOptions();if(!n)return s(null,t,e);await n.call(this,t,e,i,s)}module.exports=loader;",
        "utf8"
      );
    }
  }
  isUnocssId(id) {
    const match = id.match(this.RE);
    if (match)
      return true;
    return false;
  }
  resolveLayer(id) {
    const match = id.match(this.RE);
    if (match)
      return match[1] || LAYER_MARK_ALL;
  }
  apply(compiler) {
    const ctx = createContext(void 0, {
      envMode: process__default.env.NODE_ENV === "development" ? "dev" : "build"
    });
    const { uno, tokens, filter, extract, tasks, flushTasks } = ctx;
    const vfs = new RspackVirtualModulePlugin_1({});
    const vfs_unocss_ids = /* @__PURE__ */ new Set();
    compiler.options.plugins.push(vfs);
    const watch = (watchMode) => {
      if (!watchMode)
        return;
      tasks.push(setupContentExtractor(ctx, true));
    };
    compiler.options.module.rules.unshift({
      enforce: "pre",
      include: /.*/,
      use: (_) => {
        return [
          {
            loader: this.LOADER_PATH,
            options: {
              exec: async (code, map, id, cb) => {
                if (filter("", id) && !id.match(/\.html$/) && !this.RE.test(id)) {
                  const result = await applyTransformers(ctx, code, id, "pre");
                  const nextCode = result?.code ?? code;
                  tasks.push(extract(nextCode, id));
                  cb(null, nextCode, map);
                } else {
                  cb(null, code, map);
                }
              }
            }
          }
        ];
      }
    });
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compiler.hooks.watchRun.tapAsync(PLUGIN_NAME, (compiler2, cb) => {
        watch(compiler2.watchMode);
        cb();
      });
      compilation.normalModuleFactory?.hooks.beforeResolve.tap(
        PLUGIN_NAME,
        ({ request: id }) => {
          if (this.isUnocssId(id)) {
            const layer = this.resolveLayer(id);
            if (layer && !vfs_unocss_ids.has(layer)) {
              vfs_unocss_ids.add(layer);
              vfs.writeModule(id, getLayerPlaceholder(layer));
            }
          }
        }
      );
      compilation.hooks.processAssets.tapPromise(
        {
          name: PLUGIN_NAME
        },
        async () => {
          await flushTasks();
          const result = await uno.generate(tokens, { minify: true });
          for (const asset of compilation.getAssets()) {
            let code = asset.source?.source().toString();
            if (!code)
              return;
            let replaced = false;
            code = code.replace(LAYER_PLACEHOLDER_RE, (_, quote, layer) => {
              replaced = true;
              const css = layer === LAYER_MARK_ALL ? result.getLayers(
                void 0,
                Array.from(vfs_unocss_ids).filter(Boolean)
              ) : result.getLayer(layer) || "";
              if (!quote)
                return css;
              let escaped = JSON.stringify(css).slice(1, -1);
              if (quote === '\\"')
                escaped = JSON.stringify(escaped).slice(1, -1);
              return quote + escaped;
            });
            if (replaced) {
              compilation.updateAsset(
                asset.name,
                new WebpackSources__default.RawSource(code),
                // version: rspack 增量构建 bug
                { ...asset.info, version: "" }
              );
            }
          }
        }
      );
    });
  }
}

module.exports = UnocssRspackPlugin;
