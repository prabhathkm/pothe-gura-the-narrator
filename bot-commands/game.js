var _         = require('lodash');
var uuid      = require('uuid');
var dbUtils   = require('../lib/db-utils');
var commandsHolder = require('./commands-holder');
var constants   = require('../constants');
var logger  = require('../lib/logger');
var gamePlay   = require('../lib/game-play');

Game = (function() {

  // resume if game inprogress
  var paramsIn = commandsHolder.getParams();
  gamePlay.resume({
    db: paramsIn.db,
    userMsgQueue: paramsIn.userMsgQueue,
  });

  var self = {};

  self.getHostedGame = (db, cb) => {
    db.collection('configurations').findOne({
      key : "gameHosted"
    }, function(err, game){
      if(err){
        logger.error(err);
      }
      cb((game||{}).value);
    });
  };

  // host a game
  commandsHolder.addCommand({
    regEx: /^\s*host\s*game$/i,
    guide: 'host game',
    sample: "host game",
    description: 'Host a game',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*host\s*game\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{
          if(gameHosted && gameHosted.code){
            cb(`There is an game already hosted by ${gameHosted.host}.`);
          } else {
            var newGameCode = uuid.v4();
            dbUtils.setConfigParam(db, CONFIGS, "gameHosted", {
              code: newGameCode,
              host: user.name
            });
            
            //add host as a player
            db.collection('gamePlayers').insert({
              "username": user.name,
              "slackUserId": user.id,
              gameCode: newGameCode,
              host: true,
            }, function(){});
  
            cb("New game hosted.");
  
            logger.info(`New game started code:${newGameCode}`);
          }
        });

      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });

  // host a game
  commandsHolder.addCommand({
    regEx: /^\s*end\s*game$/i,
    guide: 'end game',
    sample: "end game",
    description: 'End the game',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*end\s*game\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{

          if(!gameHosted.code || gameHosted.host!=user.name){
            cb("There is no active game hosted by you to end.");
          } else if(gameHosted.running == true){
            cb("Game is in-progress, you cant end now");
          } else {

            // end the game
            dbUtils.setConfigParam( db, CONFIGS, "gameHosted", {} );

            // get players
            db.collection('gamePlayers').find({
              gameCode: gameHosted.code,
              leave: {$ne: true}
            }).toArray(function(err, players){

              _.each(players, function(player){
                userMsgQueue.addToQueue({
                  username: player.username,
                  attachments: [
                    {
                        "color": constants.MESSAGE_COLORS.RED,
                        "title": "GAME ENDED !",
                        "text": `The game has been ended by the host...`,
                        "fields": [],
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    },
                  ]                           
                });
              });

            });

          }
        });

      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });


  // join a game
  commandsHolder.addCommand({
    regEx: /^\s*join\s*game$/i,
    guide: 'join game',
    sample: "join game",
    description: 'Join a game',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*join\s*game\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{

          if(!gameHosted.code){
            cb("There is no active game already running.");
          } else if(gameHosted.running){
            cb("There is a game already in-progress, please join afterwards.");
          } else {
            db.collection('gamePlayers').findOne({
              gameCode: gameHosted.code,
              username: user.name
            }, function(err, gameuser){
              if(err){
                cb(constants.UNKNOWN_ERROR_STRING);
              } else if(gameuser) {
                if(gameuser.leave) {
                  // remove the leave param
                  db.collection('gamePlayers').update({
                    username: user.name,
                    gameCode: gameHosted.code
                  },{
                    $set: {
                        leave: false
                    }
                  }, {}, ()=>{});
                  cb("You have re-joined the game");
                } else {
                  cb("You are already in the game");
                }
              } else {

                db.collection('gamePlayers').insert({
                  "username": user.name,
                  "slackUserId": user.id,
                  gameCode: gameHosted.code,
                }, function(){
                  cb("Joined the game");
                });

              }
            });
          }
        });

      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });


  // join a game
  commandsHolder.addCommand({
    regEx: /^\s*leave\s*game$/i,
    guide: 'leave game',
    sample: "leave game",
    description: 'Leave a game',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*leave\s*game\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{

          if(!gameHosted.code){
            cb("There is no active game already running.");
            // mark to leave
          } else {
            db.collection('gamePlayers').findOne({
              gameCode: gameHosted.code,
              username: user.name
            }, function(err, gameuser){
              if(err){
                cb(constants.UNKNOWN_ERROR_STRING);
              } else if(gameuser) {

                if(gameHosted.running){
                  cb("There is a game already in-progress, will opt you out from next round.");
                }
                else {
                  cb("You left the game.");
                }

                // update db
                db.collection('gamePlayers').update({
                  gameCode: gameHosted.code,
                  username: user.name
                },{
                  $set: {
                      leave: true
                  }
                }, {}, ()=>{} );
                
              } else {
                cb("You are not in a game to leave.");
              }
            });
          }
        });


      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });


  // start a game
  commandsHolder.addCommand({
    regEx: /^\s*start\s*game$/i,
    guide: 'start game',
    sample: "start game",
    description: 'Start a game',
    action: function(matchedCommand, user, cb){

      var commandExtract = matchedCommand.match(/^\s*start\s*game\s*$/i);

      if(commandExtract){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{

          if(!gameHosted.code || gameHosted.host!=user.name){
            cb("There is no active game hosted by you to start.");
          } else if(gameHosted.running == true){
            cb("Game has already started");
          } else if(gameHosted.gameEnded == true){
            cb("Game is already in-progress, and a round ended. If you want to play again type `another round` ..");
          } else {
            
            // get players
            db.collection('gamePlayers').find({
              gameCode: gameHosted.code,
              leave: {$ne: true}
            }).toArray(function(err, players){
              var playersCount = _.size(players);
              if(err){
                cb(constants.UNKNOWN_ERROR_STRING);
              } else if(playersCount < 6 ) {
                cb(`Not having sufficient no of players, need atleast 6 players, Currently joined ${playersCount}`);
              } else {
                
                gameHosted.running = true;
                dbUtils.setConfigParam(db, CONFIGS, "gameHosted", gameHosted);
                logger.info(`Game started - ${gameHosted.code}`);

                gamePlay.start({
                  userMsgQueue: userMsgQueue,
                  db: db,
                  CONFIGS: CONFIGS,
                }, gameHosted, players);

              }

            });

          }
        });


      } else {
        cb(constants.INVALID_COMMAND_STRING);
      }

    }
  });

  // extend game for a new round
  commandsHolder.addCommand({
    regEx: /^\s*(another\s*(round|game))|\+1\s*$/i,
    guide: 'another round / +1',
    sample: "another round",
    description: 'Another round',
    action: function(matchedCommand, user, cb){

        var params = commandsHolder.getParams();
        var db = params.db;
        var CONFIGS = params.CONFIGS;
        var userMsgQueue = params.userMsgQueue;
        var rtm = params.rtm;

        self.getHostedGame(db, (gameHosted)=>{

          if(!gameHosted.code || gameHosted.host!=user.name){
            cb("There is no active game hosted by you to extend.");
          } else if(gameHosted.running == true){
            cb("Game is already running");
          } else if(gameHosted.gameEnded) {
            
            // get players
            db.collection('gamePlayers').find({
              gameCode: gameHosted.code,
              leave : { $ne: true }
            }).toArray(function(err, players){
              var playersCount = _.size(players);
              if(err){
                cb(constants.UNKNOWN_ERROR_STRING);
              } else if(playersCount < 6 ) {
                cb(`Not having sufficient no of players, need atleast 6 players, Currently joined ${playersCount}`);
              } else {
                
                // host as a new game 
                var newGameCode = uuid.v4();
                dbUtils.setConfigParam(db, CONFIGS, "gameHosted", {
                  code: newGameCode,
                  host: user.name
                });

                // add players to the new game
                var newPlayers = [];
                _.each(players, function(player){
                  var playerObj = {
                    username: player.username,
                    slackUserId: player.slackUserId,
                    gameCode: newGameCode,
                    host: player.host,
                  }
                  db.collection('gamePlayers').insert(playerObj, function(){});
                  newPlayers.push(playerObj);
                });

                cb("Starting another round...");

                setTimeout(() => {
                  logger.info(`Game new round started - ${newGameCode}`);
                  gamePlay.start({
                    userMsgQueue: userMsgQueue,
                    db: db,
                    CONFIGS: CONFIGS,
                  }, {
                    code: newGameCode,
                    host: gameHosted.host
                  }, newPlayers);
                }, 3000);
                
              }

            });

          } else {
            cb("There's no previous game for you to play another round");
          }
        });


    }
  });


  // in game msgs
  commandsHolder.addCommand({
    regEx: /^.*$/i,
    guide: 'In game direct messages',
    sample: "<as game proceeds>",
    description: 'Commands as game proceeds',
    action: function(matchedCommand, user, cb){

      gamePlay.messageIn(matchedCommand, user, function(){
        // irrelavant msg callback - migth have to do something later
      }, cb);

    }
  });

  return;

})();

module.exports = commandsHolder;