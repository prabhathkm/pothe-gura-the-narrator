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
    var userMsgQueue = self.userMsgQueue;

    console.log("RUN");


  };

return pub;

})();

module.exports = OrderingStart;
