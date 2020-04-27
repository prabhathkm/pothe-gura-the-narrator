var winston = require('winston');

Logger = (function() {
  /**
 * Logger definitions
 */
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        timestamp: function() {
          var now = new Date();
          return now.getFullYear() + '-' +
            (now.getMonth() + 1) + '-' +
            now.getDate() + '_' +
            now.getHours() + ':' +
            now.getMinutes() + ':' +
            now.getSeconds() + ':' +
            now.getMilliseconds();
        },
        formatter: function(options) {
          if(options.level=='error'){
            // can inturrupt error reports and do something. :) 
          }
          // Return string will be passed to logger.
          return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (undefined !== options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
        }
      })
    ]
  });
  
  return logger;
})();

module.exports = Logger;