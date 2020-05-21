var dbConnector = require('./lib/dbConnector');
var utils       = require('./lib/utils');
var dbUtils       = require('./lib/db-utils');
var _           = require('lodash');
var constants   = require('./constants');
var uuid        = require('uuid');
var SlackBot    = require('slackbots');
var CronJob     = require('cron').CronJob;
var RtmClient     = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS    = require('@slack/client').RTM_EVENTS;
var logger  = require('./lib/logger');

var MultiThreadedQueue  = require('multi-threaded-queue');

var msgQueueThrottle = 1000;
var msgQueueThreads = 5;


/**
 * CONNECT TO DB
 */
dbConnector.getDbConnection(function dbConCb(dbConErr, db) {
  if (dbConErr) {
    logger.error(dbConErr);
  } else {
    logger.info('Connected to DB..');

    dbUtils.getConfigurations(db, function(err, CONFIGS){

      var botSettings =  dbUtils.getConfigParam(CONFIGS, "botSettings").value;
      var timeZone = dbUtils.getConfigParam(CONFIGS, "timeZone").value;

      // create a bot
      var bot = new SlackBot({
        token: botSettings.botToken,
        name: botSettings.botName
      });

      var rtm = new RtmClient(botSettings.botToken, {logLevel: 'info'});

      // Message sending queue with throttling
      var msgQueue = new MultiThreadedQueue( msgQueueThreads, {
        autoStart:true,
        executeFunction: function(obj, next){
          if(obj){

            // avoid msgs for dummy users
            if(constants.TEST_MODE) {
              _.each(obj.attachments, (a)=>{ 
                console.log(`>> ${obj.username} > -- ${a.title}`);
                console.log(`>> ${obj.username} > ----- ${a.text}`);
              });
              
              if(obj.username!="prabhaths"){
                setTimeout( next , msgQueueThrottle);
                return;
              }
            }

            var params = {};
            if(obj.attachments){
              params.attachments = obj.attachments;
            }

            if(obj.postToChannelId){
              bot.postMessage(obj.postToChannelId, obj.message , params, function(data){
                if(!data || !data.ok) {
                  logger.error('ERROR ' , data);
                  logger.error("userMsgQueue message obj: ", JSON.stringify(obj));
                }
              });
            } else {
              bot.postMessageToUser(obj.username,obj.message , params, function(data){
                if(!data || !data.ok){
                  logger.error('ERROR ' , data);
                  logger.error("userMsgQueue message obj: ", JSON.stringify(obj));
                }
              });
            }

            setTimeout( next , msgQueueThrottle);
          }
        },
        completeFunction: function(){}
      });



      /**
       * BOT CONNECTOR STARTED
       */
      bot.on('start', function() {

        /**
         * CRON JOBS
         */
        
        // schedule functions
        var hourlyJobFunc    = require('./schedule-jobs/hourly-check');
        
        // // start
        hourlyJobFunc.setParams({
          db       : db,
          timeZone : timeZone,
          CONFIGS  : CONFIGS,
          msgQueue : msgQueue,
        });
        var hourlyJob = new CronJob( "00 0-59/2 * * * *" , hourlyJobFunc.run, function () {},
            true, 
            timeZone 
        );

        
        /**
         * END CRON JOBS
         */

      });

      

      /**
       * List of commands
       */
      var commandList = [];


      /**
       * LOADING COMMANDS
       */
      
      // user handling commands
      var userHandling = require('./bot-commands/user-handling');
      userHandling.setParams({
        rtm: rtm,
        db:db,
        userMsgQueue: msgQueue
      });

      var helpHandling = require('./bot-commands/help');
      helpHandling.setParams({
        db:db,
        userMsgQueue: msgQueue
      });

      var gameHandling = require('./bot-commands/game');
      gameHandling.setParams({
        rtm: rtm,
        db:db,
        CONFIGS: CONFIGS,
        userMsgQueue: msgQueue
      });

      var commandsHolder = require('./bot-commands/commands-holder');
      commandList = _.extend(commandList, commandsHolder.getCommands());


       /**
        * END LOADING COMMANDS
        */


      /**
       *
       * COMMANDS HANDLING SECTION
       *
       *
       */

      rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
        logger.info('Logged in as ' + rtmStartData.self.name+ ' of team '+ rtmStartData.team.name + ', but not yet connected to a channel');
      });

      rtm.on(RTM_EVENTS.MESSAGE, function (message) {

        if (!((rtm.dataStore.getUserById(message.user) || {}).profile || {}).bot_id && (!message.subtype || message.subtype!='bot_message' )) {

          var user = rtm.dataStore.getUserById(message.user);
          var userEmail = (( user|| {}).profile || {}).email;

          // verify message source from direct message or mentioned on a channel
          var pmChannelId = botSettings.botPmChannelId;
          var botUserId = botSettings.botUserId;
          var regExBotId = new RegExp('^\<\@'+botUserId+'\>(.*)', '');

          var pmOnChannel = null;
          if(message && message.text) {
            pmOnChannel = message.text.match(regExBotId);
          }
          
          var validPm = true;
          if(pmOnChannel && pmOnChannel[1]){
            message.text = pmOnChannel[1];
            validPm = true;
          }
          if(message.channel===pmChannelId){
            validPm = true;
          }

          if(userEmail && message.type==='message' && validPm){

              logger.info("[USER]:"+userEmail+" <"+message.user+"> , [MESSAGE]:"+ message.text);

              var matched = false;
              var cmd=message.text;

              utils.customCommandListByPermission(db, commandList, user, function(err, userFound, commandListByUser){
                if(!userFound){
                  logger.info("[ERROR] You are not authorized to communicate with me. [USER]: "+user.name);
                  
                  msgQueue.addToQueue({
                    username: user.name,
                    attachments: [
                      {
                        "color": constants.MESSAGE_COLORS.RED,
                        "title": "Oops..",
                        "text": "You are not authorized to communicate with me.",
                        "fields": [ ],
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png"
                      },
                    ]
                  });

                } else if(!err){

                  _.each(commandListByUser, function(cmdDef){
                    if( cmdDef.regEx.test(cmd) ){
                      matched=true;

                      cmdDef.action(cmd, user, function (resp) {
                        sendReply(rtm,resp, message);
                      });

                    }
                  });

                } else {
                  sendReply(rtm,constants.UNKNOWN_ERROR_STRING, message);
                }


              });

          }

        }

      });

      rtm.start();

      rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function (rtmStartData) {

      });

    });

  }
});


/**
 *
 * SEND message reply
 *
 * @param rtm
 * @param reply
 * @param message
 */
function sendReply(rtm, reply, message) {
  if (reply) {
    rtm.sendMessage(reply, message.channel);
  }
}
