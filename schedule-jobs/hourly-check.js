var dbUtils   = require('../lib/db-utils');
var utils     = require('../lib/utils');
var _         = require('lodash');
var logger  = require('../lib/logger');
var moment  = require('moment-timezone');
var constants   = require('../constants');
var TBLMaker    = require('../lib/tblMaker');

OrderingStart = (function() {
  var self = {};
  var pub = {};

  pub.setParams = function(opt) {
    _.each(opt, function(v,k){
      self[k] = v;
    });
  }

  pub.run = function(){

    var db       = self.db;
    var timeZone = self.timeZone;
    var CONFIGS  = self.CONFIGS;
    var msgQueue = self.msgQueue;

    // check for hosted game with no updates for 1hr and remove
    var timeBefore1Hr = new Date();
    timeBefore1Hr.setHours(timeBefore1Hr.getHours() - 1);

    db.collection('configurations').findOne({
      key: "gameHosted",
      $and: [ { "value.lastActivityOn": { $ne : null } }, { "value.lastActivityOn": { $lte: timeBefore1Hr } } ] 
    }, function(err, oldGame){
      if(err){
        logger.error(err);
      }

      if(oldGame){ // found a game to expire

        // send a msg to host saying game has been removed
        msgQueue.addToQueue({
          username: oldGame.host,
          attachments: [
          {
              "color": constants.MESSAGE_COLORS.GREEN,
              "title": "GAME GOT EXPIRED !",
              "text": `The game you hosted have just got expired due to lack of activity. ( Fair usage policy :stuck_out_tongue: )`,
              "fields": [],
              "footer": "Create a new game when you wants to play again.",
              "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
          },
          ]                           
        });

        // update DB
        dbUtils.setConfigParam( db, CONFIGS, "gameHosted", {} );

      }

    });


  };

return pub;

})();

module.exports = OrderingStart;
