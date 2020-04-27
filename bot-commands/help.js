var _         = require('lodash');
var utils       = require('../lib/utils');
var commandsHolder = require('./commands-holder');
var constants   = require('../constants');
var logger  = require('../lib/logger');

UserHandlingCommands = (function() {
  
  // add user command
  commandsHolder.addCommand({
    regEx: /help\s*(samples|ex)?\s*/i,
    guide: 'help <samples|ex - optional>',
    sample: "help ex",
    description: 'Show help w/o samples',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/help\s*(samples|ex)?\s*/i);
      var needSamples = commandExtract[1]?true:false;

      var params = commandsHolder.getParams();
        var db = params.db;

        var commandList = commandsHolder.getCommands();

        utils.customCommandListByPermission(db, commandList, user, function(err, userFound, commandListByUser){

            if(err){
                cb(constants.UNKNOWN_ERROR_STRING);
            } else {
                // arrange the help considering cmd weight
                var sortedCommandList = _.sortBy(commandListByUser, function(num) {
                  return num.weight?-num.weight:0;
                });

                var helpLines = [];
                _.each(sortedCommandList, function(cmdHelp){
                  helpLines.push( 
                    ">*- `"+cmdHelp.guide+"`* " 
                    + (cmdHelp.description?`: _${cmdHelp.description}_`:"") 
                    + (needSamples&&cmdHelp.sample?`\n>*---* _sample command:_ *${cmdHelp.sample}*`:""));
                });
                var txtOut = ">*------ HELP - List of commands ------*\n" +helpLines.join("\n");
                // inform abt samples
                txtOut = needSamples?txtOut:`${txtOut}\n\n>*-- Type \`help samples\` or \`help ex\` for a help with sample commands.*`;

                cb(txtOut);
            }

        });
      
    }
  });

  return;

})();

module.exports = commandsHolder;