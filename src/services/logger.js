var _ = require('underscore');
var Moment = require('moment-timezone');

exports.create = function (options) {
  // var loggers = [console];
  var levels = {debug: 0, info: 1, error: 2, fatal: 3};
  var level;

  function write(func, msg) {
    loggers.forEach(function doLog(logger) {
      logger[func].apply(logger, [msg]);
    });
  }

  function getDateParts() {
    var dateParts = Moment().tz('America/New_York').format();
    return {
      date: dateParts,
      time: dateParts
    };
  }

  function serialize(results, args) {
    if (!args) { return results; }
    if (Array.isArray(args)) {
      args.forEach(function (a) {
        serialize(results, a);
      });
      return results;
    }
    if (args.stack) {
      if (args.errorCode) {
        results.push(
          JSON.stringify({
            errorCode: args.errorCode,
            message: args.message,
            arguments: args.arguments,
            type: args.type
          }) +
          '\n' + JSON.stringify(args.data) +
          '\n' + args.stack + '\n'
        );
      } else {
        results.push(
          JSON.stringify({
            message: args.message,
            arguments: args.arguments,
            type: args.type
          }) +
          args.stack + '\n'
        );
      }
    } else {
      results.push(JSON.stringify(args) + '\n');
    }
  }

  function buildMessage(level, msg, args) {
    var serialized = serialize([], args);
    var dateParts = getDateParts();
    var tokens = {
      date: dateParts.date,
      time: dateParts.time,
      level: level,
      message: msg,
      serverId: options.serverId,
      data: serialized
    };
    return tokens;
  }

  return {
    setLevel: function (minLevel) {
      level = minLevel;
    },

    getLevel: function () {
      if (!level) {
        level = options.level;
      }
      return level;
    },

    getLoggers: function () {
      return loggers;
    },

    addLogger: function (logger) {
      if (logger.error && _.isFunction(logger.error)) {
        loggers.push(logger);
      } else {
        var loggerOptions = options.loggers[logger];
        loggers.push(require('./logger.' + logger).create(loggerOptions));
      }
    },

    clearLoggers: function () {
      loggers = [];
    },

    // Level 0
    debug: function (msg, args) {
      if (levels[this.getLevel()] <= 0) {
          write('error', buildMessage('debug', msg, args));
      }
    },

    // Level 1
    info: function (msg, args) {
      if (levels[this.getLevel()] <= 1) {
          write('error', buildMessage('info', msg, args));
      }
    },

    // Level 2
    error: function (msg, args) {
      if (levels[this.getLevel()] <= 2) {
          write('error', buildMessage('error', msg, args));
      }
    },

    // Level 3
    fatal: function (msg, args) {
      if (levels[this.getLevel()] <= 3) {
          write('error', buildMessage('fatal', msg, args));
      }
    }
  };
};