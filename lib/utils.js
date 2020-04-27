var _        = require('lodash');
var uuid     = require('uuid');
var TBLMaker = require('./tblMaker');
var constants   = require('../constants');

Utils = (function() {
  var self = {};
  var pub = {};

  pub.equalConsideringNull = function(a,b) {
    if( null==a && null==b ) {
      return true;
    } else {
      if(a == b){
        return true;
      }
    }
    return false;
  }


  /**
  * GET command list by permissions
  *
  * @param db
  * @param commandList
  * @param user
  * @param cb
  */
  pub.customCommandListByPermission = function(db, commandList, user, cb){
    db.collection('users').findOne({
      username: user.name
    }, function(err, userMatched){
      if(err){
        cb(err);
      } else {
  
        var filteredCommandsList = [];
  
        _.each(commandList, function(cmdDef){
          if(cmdDef){
  
            // no permission check
            if(!cmdDef.permission){
              filteredCommandsList.push(cmdDef);
            } else {
  
              var hasPermission = false;
  
              _.each(cmdDef.permission, function(flag){
                  if(userMatched && userMatched[flag]){
                    hasPermission = true;
                  }
              });
  
              if(hasPermission){
                filteredCommandsList.push(cmdDef);
              }

            }
  
          }
       });
 
       cb(null, userMatched, filteredCommandsList);
 
     }
   });
  };

  
  return pub;
})();

module.exports = Utils;