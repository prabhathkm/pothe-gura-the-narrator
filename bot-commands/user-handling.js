var _         = require('lodash');
var uuid      = require('uuid');
var dbUtils   = require('../lib/db-utils');
var commandsHolder = require('./commands-holder');
var constants   = require('../constants');
var logger  = require('../lib/logger');

UserHandlingCommands = (function() {
  
  // add user command
  commandsHolder.addCommand({
    regEx: /^add\s*(.*)/i,
    guide: 'add @user',
    sample: "add @saman",
    description: 'Add user',
    permission: ["isAdmin"],
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*add\s*\<\@([\w]*)\>\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        var userIn = rtm.dataStore.getUserById(commandExtract[1]);
        var username = userIn.name;
        var userSlackProfile = (userIn.profile||{});
        var realName = userSlackProfile.real_name || userSlackProfile.first_name || username;
        var displayName = userSlackProfile.display_name || userSlackProfile.first_name || username;
        var userId = userIn.id;
        var emailAddress = userSlackProfile.email;

        dbUtils.getUserFromDb(db, {
          "username": user.name
        }, function(err, executingUser){
          
            dbUtils.getUserFromDb(db, {
                "username": username
              }, function(err, userMatched){

                if(err){
                    cb(constants.UNKNOWN_ERROR_STRING);
                } else if(userMatched) {
                    cb("User ("+displayName+") already exists in the same team.");
                } else {

                    db.collection('users').insert({
                        "username": username,
                        "realName": realName,
                        "displayName": displayName,
                        "slackUserId": userId,
                        "email": emailAddress
                      }, function(){
                        cb("User ("+displayName+") added successfully.");
                      //   userMsgQueue.addToQueue({
                      //     username: username,
                      //     attachments: [
                      //       {
                      //         "color": constants.MESSAGE_COLORS.GREEN,
                      //         "title": "ADDED TO THE BOT !",
                      //         "text": "You have been added to the bot",
                      //         "fields": [],
                      //         "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                      //       },
                      //     ]                           
                      //   });
                      });

                }
              });

        });


      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });

  return;

})();

module.exports = commandsHolder;