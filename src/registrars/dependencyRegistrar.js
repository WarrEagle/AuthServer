exports.register = function (app, settings) {
  app._logger = null;
  app.__defineGetter__("logger", function () {
    if (!app._logger) {
      var baseLogger = require('../services/logger').create(settings.app.logging);
      baseLogger.clearLoggers();

      settings.app.logging.enabled.forEach(function (loggerName) {
        baseLogger.addLogger(loggerName);
      });

      app._logger = baseLogger;
    }
    return app._logger;
  });
};