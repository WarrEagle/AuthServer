var util = require('util');
var color = require('ansi-color').set;
var colorFromLevel = {
  info: 'yellow',
  debug: 'blue',
  error: 'red',
  fatal: 'red_bg+white'
};

exports.create = function (options) {
  return {
    error: function (tokens) {
      var msg = tokens.level.toUpperCase() + ' - ' +
        tokens.date + ' ' + tokens.time + ' - ' +
        tokens.serverId + ' - ' +
        tokens.message;

      if (tokens.data) {
        msg += '\n' + tokens.data;
      }

      util.error(color(msg, colorFromLevel[tokens.level.toLowerCase()]));
    },

    // Used for Express logger
    write: function (buf, encoding) {
      util.error(buf);
    }
  }
};