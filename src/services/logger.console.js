var util = require('util');

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

      util.error(msg);
    },

    // Used for Express logger
    write: function (buf, encoding) {
      util.error(buf);
    }
  }
};
