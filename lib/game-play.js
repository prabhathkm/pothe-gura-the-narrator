var logger = require('./logger');
var constants   = require('../constants');

var _        = require('lodash');
var uuid     = require('uuid');

const civilianKey = "CIVILIAN";

var HOST_COMBINATION_TIME_LIMIT_SECONDS = 30;
var NIGHT_TIME_LIMIT_SECONDS = 60;
var DAY_TIME_LIMIT_SECONDS = 120;
var LAST_X_SECONDS_FOR_VOTING = 10;



GamePlay = (function() {
  var self = {};
  var pub = {};

  self.gameInProgress = false;
  self.host = null;
  self.gameCode = null;
  self.currentRound = 0;

  self.combinations = null;

  self.userMsgQueue = null;
  self.db = null;

  self.endRoundTimer = null;
  self.endRoundTimerStartedAt = null;
  self.lastXSecondsTimer = null;


  pub.getCombination = function(noOfPlayers){
      var combination = {};
      var remaining = noOfPlayers;
      _.each(constants.CHARACTERS, function(character,k){
          if(character.defaultRate){
                var count = character.defaultRate(noOfPlayers) || 0;
              combination[k] = {
                  code: character.code,
                  count: count,
                  character: k
              };
              remaining -= count;
          }
      });

      // fill civilians
      combination[civilianKey] = {
        code: constants.CHARACTERS.CIVILIAN.code,
        count: remaining,
        character: civilianKey
      };

      return combination;

  };

  self.updateTimeLimits = ()=>{
      if(self.db){
        self.db.collection('configurations').findOne({
            key : "gameTimeLimits"
          }, function(err, limits){
            if(err){
              logger.error(err);
            }
            var timeLimits = (limits||{}).value || {};

            HOST_COMBINATION_TIME_LIMIT_SECONDS = parseInt(timeLimits.HOST_COMBINATION_TIME_LIMIT_SECONDS || HOST_COMBINATION_TIME_LIMIT_SECONDS);
            NIGHT_TIME_LIMIT_SECONDS = parseInt(timeLimits.NIGHT_TIME_LIMIT_SECONDS || NIGHT_TIME_LIMIT_SECONDS);
            DAY_TIME_LIMIT_SECONDS = parseInt(timeLimits.DAY_TIME_LIMIT_SECONDS || DAY_TIME_LIMIT_SECONDS);
            LAST_X_SECONDS_FOR_VOTING = parseInt(timeLimits.LAST_X_SECONDS_FOR_VOTING || LAST_X_SECONDS_FOR_VOTING);

          });
      }
  };

  self.assignPlayerRoles = function(players, roles){
    var shuffledPlayers = _.shuffle(players);
    var shuffledRoles = _.shuffle( JSON.parse(JSON.stringify(roles)) );

    _.each(shuffledPlayers, function(player){
        // get role
        var role = _.find(shuffledRoles, (r)=>{ return r.count>0 });
        if(role){
            players[player.username].role = role.character;
            role.count = role.count-1;
        } else {
            logger.error(`NO ROLE MATCED for player ${player.username}`);
        }
    });
  };

  self.updatePlayerRolesOnDB = (db, gameCode, players) => {
      _.each(players, (player,username) => {
        db.collection('gamePlayers').update({
            gameCode: gameCode,
            username: username
          },{
            $set: {
                role: player.role
            }
          }, {}, ()=>{} );
      });
  }


  pub.start = function(params, game, players){
    game = game || {};

    self.players = _.keyBy(players, "username");
    self.host = _.find(players, function(p){
        return p.host;
    });
    

    if(!self.host){
        logger.error(`Host not found, game: ${game.code}`);
    }

    self.gameCode = game.code;

    if(game.round){
        // TODO ? ROUND already there
        logger.error(`Should not HIT here unless a code logic error, game: ${game.code}`);

        pub.resume({
            db: self.db,
            userMsgQueue: params.userMsgQueue
        });

    } else {

        // get recommended combination
        var noOfPlayers = _.size(players);
        var combination = pub.getCombination(noOfPlayers);
        var combinationStrArr = [];
        _.each(combination, function(char){
            combinationStrArr.push(`${char.code}-${char.count}`);
        });

        // character def
        var charDefArr = [];
        _.each(constants.CHARACTERS, (character)=>{
            charDefArr.push(`${character.code}:${character.role}`);
        });

        self.combinations = combination;

        self.userMsgQueue = params.userMsgQueue;
        self.db = params.db;

        self.updateTimeLimits();

        params.userMsgQueue.addToQueue({
            username: self.host.username,
            attachments: [
            {
                "color": constants.MESSAGE_COLORS.GREEN,
                "title": "GAME STARTED !",
                "text": `You have ${HOST_COMBINATION_TIME_LIMIT_SECONDS} seconds to the character combination or narrator will follow with below combination.` +
                         `\nNo. of players: \`${noOfPlayers}\`` +
                         `\n\`\`\`${charDefArr.join(", ")}\`\`\`\n${combinationStrArr.join(", ")}`,
                "fields": [],
                "footer": "Just enter your role mix in above format *c-4,m-2,..*",
                "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
            },
            ]                           
        });

        logger.info(`ROUND ${self.currentRound} - STARTED`);

        // after the timeout
        setTimeout(function(){
            self.gameInProgress = true;

            // assign roles for players..
            self.assignPlayerRoles(self.players, self.combinations);
            self.updatePlayerRolesOnDB(self.db, self.gameCode, self.players);

            self.currentRound = 1;
            

            //inform players about their role
            var pauseSecondsBeforeStartGame = 10;
            _.each(self.players, (player)=> {
                params.userMsgQueue.addToQueue({
                    username: player.username,
                    attachments: [
                    {
                        "color": constants.MESSAGE_COLORS.ASH,
                        "title": "YAY! .. YOU HAVE ASSIGNED WITH A ROLE !",
                        "text": `Your role for this round of the game will be *${player.role}*`,
                        "fields": [],
                        "footer": `Game will start in ${pauseSecondsBeforeStartGame} seconds...`,
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    },
                    ]                           
                });
            });

            // pause and start
            setTimeout(function(){
                self.startRound(self.db, self.gameCode, self.currentRound);
            }, pauseSecondsBeforeStartGame*1000);



        }, HOST_COMBINATION_TIME_LIMIT_SECONDS*1000);
        
    }
  }

  self.isInNight = (round)=> {
    // its day if divisable by 2
    return ( (round || 0) % 2 != 0 );
  };

  self.makePlayersStr = (players)=>{
      var arr = _.map(players, (p)=>{
        return `<@${p.slackUserId}>`
      });
      return arr.join(", ");
  }

  self.tempPrintLivePlayers = ()=>{
      console.log(`----------- ROUND ${self.currentRound}`)
    _.each(self.players, (p)=>{
        console.log(`${p.username} ${p.role} - ${p.vote} ${p.dead?"DEAD":""}`);
    });
    console.log("------------------------")
  }

  self.startRound = (db, gameCode, round) => {
        self.currentRound = round;

        self.tempPrintLivePlayers();

        // update the round on DB
        db.collection('configurations').update({
            key : "gameHosted"
        },{
            $set: {
                "value.round": self.currentRound
            }
        }, {}, ()=>{} );

        var playersAlive = _.filter(self.players, (p)=>{ return !p.dead });
        var mafiasAlive = _.filter(playersAlive, (p)=>{ return p.role==constants.CHARACTERS.MAFIA.role });
        var nonMafiasAlive = _.filter(playersAlive, (p)=>{ return p.role!=constants.CHARACTERS.MAFIA.role });

        var noOfMafiasAlive = _.size(mafiasAlive);
        var noOfPlayersAlive = _.size(playersAlive);

        var liveNonMafiaPlayersStr = self.makePlayersStr(nonMafiasAlive);
        var liveMafiaPlayersStr = self.makePlayersStr(mafiasAlive);
        var livePlayersStr = self.makePlayersStr(playersAlive);

        // winning situation - if mafia>=civilians or mafia = 0
        if(noOfMafiasAlive == 0){
            // civilians wins
            self.endGame(true, gameCode);
            logger.info(`CIVILIANS WON, game: ${gameCode}`);
        } else if(noOfPlayersAlive <= noOfMafiasAlive*2 ){
            // mafia wins
            self.endGame(false, gameCode);
            logger.info(`MAFIA WON, game: ${gameCode}`);
            
        } else {
            // proceed to the round
            if (self.isInNight(round)){
                logger.info(`NIGHT TIME, game: ${gameCode}`);

                // message for all live players
                _.each(self.players,function(player){
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "NIGHT TIME !",
                            "text": `Night will be there for ${NIGHT_TIME_LIMIT_SECONDS} seconds from now..`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                           
                    });
                });
                
                // ask mafia's to pick a player to kill
                _.each(mafiasAlive,function(player){
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "KILL SOMEONE !",
                            "text": `We have ${noOfMafiasAlive} mafias alive (${liveMafiaPlayersStr}), kill some one out of .. \n  ---> ${liveNonMafiaPlayersStr}`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                           
                    });
                });

                // ask doctor to pick a player to heal
                var doctorsAlive = _.filter(playersAlive, (p)=>{ return p.role==constants.CHARACTERS.DOCTOR.role });
                _.each(doctorsAlive,function(player){
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "HEAL SOMEONE !",
                            "text": `We have ${noOfPlayersAlive} players alive, heal some one out of .. \n ${livePlayersStr}`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                           
                    });
                });

                // ask inspector to pick a player to inspect
                var inspectorsAlive = _.filter(playersAlive, (p)=>{ return p.role==constants.CHARACTERS.INSPECTOR.role });
                _.each(inspectorsAlive,function(player){
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "INSPECT SOMEONE !",
                            "text": `We have ${noOfPlayersAlive} players alive, inspect some one out of .. \n ${livePlayersStr}`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                           
                    });
                });

                self.endRoundTimer = setTimeout(function(){
                    self.endRound(db, gameCode, round);
                }, NIGHT_TIME_LIMIT_SECONDS*1000);
                self.endRoundTimerStartedAt = new Date();

                // setup last x seconds msg
                var votersAlive = _.filter(playersAlive, (p)=>{ return p.role != constants.CHARACTERS.CIVILIAN.role });
                self.lastXSecondsMessage(NIGHT_TIME_LIMIT_SECONDS, votersAlive);
                

            } else {
                logger.info(`DAY TIME, game: ${gameCode}`);

                // inform day time for all users
                _.each(self.players,function(player){
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "DAY TIME !",
                            "text": `Day time will be there for ${DAY_TIME_LIMIT_SECONDS} seconds from now..\nWe have ${noOfPlayersAlive} players alive, vote to execute some one out of .. \n ${livePlayersStr}`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                      
                    });
                });

                self.endRoundTimer = setTimeout(function(){
                    self.endRound(db, gameCode, round);
                }, DAY_TIME_LIMIT_SECONDS*1000);
                self.endRoundTimerStartedAt = new Date();

                // setup last x seconds msg
                self.lastXSecondsMessage(DAY_TIME_LIMIT_SECONDS, playersAlive);
            }
        }
        
  };

  self.lastXSecondsMessage = (voteTimeLimit, votersAlive) => {
    // feasible to have last x seconds msg
    if( voteTimeLimit >= (2*LAST_X_SECONDS_FOR_VOTING) ){
        self.lastXSecondsTimer = setTimeout(function(){
            _.each(votersAlive, (player)=>{
                self.userMsgQueue.addToQueue({
                    username: player.username,
                    attachments: [
                    {
                        "color": constants.MESSAGE_COLORS.ASH,
                        "title": "HURRY UP !",
                        "text": `Last ${LAST_X_SECONDS_FOR_VOTING} seconds to end voting for this round ...`,
                        "fields": [],
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    },
                    ]                           
                });
            });
        }, (voteTimeLimit-LAST_X_SECONDS_FOR_VOTING)*1000);
    }
  };
  
  self.endGame = (civiliansWon, gameCode) => {
    var msg = "MAFIA won the game, you dumb civilians... "
    if(civiliansWon){
        msg = "CIVILIANS won the game..."
    }

    _.each(self.players, (player)=>{
        self.userMsgQueue.addToQueue({
            username: player.username,
            attachments: [
            {
                "color": constants.MESSAGE_COLORS.GREEN,
                "title": "GAME OVER !!!",
                "text": msg,
                "fields": [],
                "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
            },
            ]                      
        });
    });

    // mark as game over
    self.gameInProgress = false;
    self.db.collection('configurations').update({
        key : "gameHosted"
    },{
        $set: {
            "value.running": false,
            "value.gameEnded": true,
        }
    }, {}, ()=>{} );

    self.host = null;
    self.gameCode = null;
    self.currentRound = 0;

  self.combinations = null;

    // TODO - share the game script

  };

  self.updatePlayerOnDB = (db, gameCode, username, paramsToUpdate) => {
    db.collection('gamePlayers').update({
        gameCode: gameCode,
        username: username
      },{
        $set: paramsToUpdate
      }, {}, ()=>{} );
  };

  self.endRound = (db, gameCode, round)=>{

    var playersAlive = _.filter(self.players, (p)=>{ return !p.dead });

      // decide whos dead
      var deadGuy = self.findWhosDead(playersAlive, gameCode) || {};
      if(!deadGuy.doctorHealed){
        self.players[deadGuy.username].dead = true;

        // update DB with dead guy
        self.updatePlayerOnDB(db,gameCode, deadGuy.username, {
            dead: true
        });
      }
      

      // do the coms about the death and status
      if(self.isInNight(self.currentRound)){

        var mafiasAlive = _.filter(playersAlive, (p)=>{ return (p.role==constants.CHARACTERS.MAFIA.role) });
        var mafiaCount = _.size(mafiasAlive);

        // inform mafia about the kill
        var killStr = `Player <@${deadGuy.slackUserId}> was selected to be killed`;
        killStr += deadGuy.random?" randomly since there were no votes.":` with ${deadGuy.count} votes.`;

        _.each(mafiasAlive, (mafia)=>{
            self.userMsgQueue.addToQueue({
                username: mafia.username,
                attachments: [
                {
                    "color": constants.MESSAGE_COLORS.RED,
                    "title": "MAFIA SELECTION",
                    "text": killStr,
                    "fields": [],
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                },
                ]                      
            });
        });

        // let inspector know about his findings
        var inspector = _.find(self.players, (p)=>{ return (p.role==constants.CHARACTERS.INSPECTOR.role) });
        if(inspector && inspector.vote && !inspector.dead){
            var inspected = _.find(playersAlive, (p)=>{ return (p.username==inspector.vote) });
            if(inspected){
                var inspectResult = (inspected.role==constants.CHARACTERS.MAFIA.role)?"is a `MAFIA`":"is not a MAFIA";

                self.userMsgQueue.addToQueue({
                    username: inspector.username,
                    attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.GREEN,
                            "title": "INSPECTION RESULT",
                            "text": `The player you inspected <@${inspected.slackUserId}> ${inspectResult}`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                    ]                      
                });

            }
        }
        

        // inform all about the kill
        var story = `No one got killed last night, ${mafiaCount || 0} gunshot(s) were fired`;
        if(!deadGuy.doctorHealed){
            story = `<@${deadGuy.slackUserId}> died last night, ${mafiaCount || 0} gunshot(s) were fired`;
          }
        _.each(self.players, (player)=>{
            self.userMsgQueue.addToQueue({
                username: player.username,
                attachments: [
                {
                    "color": constants.MESSAGE_COLORS.ASH,
                    "title": "DURING THE NIGHT TIME...",
                    "text": story,
                    "fields": [],
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                },
                ]                      
            });
        });


      } else {

        // inform all about the kill
        var story = `Player <@${deadGuy.slackUserId}> was selected to be executed`;
        story += deadGuy.random?" randomly since there were no votes.":` with ${deadGuy.count} votes.`;
        _.each(self.players, (player)=>{
            self.userMsgQueue.addToQueue({
                username: player.username,
                attachments: [
                {
                    "color": constants.MESSAGE_COLORS.ORANGE,
                    "title": "DURING THE DAY TIME...",
                    "text": story,
                    "fields": [],
                    "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                },
                ]                      
            });
        });

      }

      // clear votes 
      _.each(self.players, (player)=>{
          player.vote = null;
          player.doctorHealed = null;
          // clear on db
          self.updatePlayerOnDB(db, gameCode, player.username, {
                vote: null
          });
      });
      
      // proceed to next round
      self.startRound(db, gameCode, (round+1) );

  };

  self.findWhosDead = (playersAlive, gameCode)=>{

    var deadGuy = null;

    var pickDeadGuyFromVotes = (voters, killPool) => {
        var deadGuy = {};
        var votes = {};
          _.each(voters, (player)=>{
            if(player.vote){
                votes[player.vote] = votes[player.vote] || {
                    username: player.vote,
                    count: 0
                };
                votes[player.vote].count = votes[player.vote].count + 1;

                if(votes[player.vote].voteTime){
                    if(votes[player.vote].voteTime>player.voteTime){
                        votes[player.vote].voteTime = player.voteTime;
                    }
                } else {
                    votes[player.vote].voteTime = player.voteTime;
                }
            }
          });

          // analyse votes
          if(_.size(votes)==0){ // no votes pick a random kill
            var shuffled = _.shuffle(killPool);
            deadGuy = {
                random: true,
                mafiaKill: true,
                username: shuffled[0].username
            };
          } else if(_.size(votes)==1){ // only one candidate
            deadGuy = votes[ Object.keys(votes)[0] ];
          } else {
            var votesInCountAndTimeOrder = _.sortBy(votes, [(o)=>{ return -o.count; }, (o)=>{ return -o.voteTime; } ]);
            deadGuy = votesInCountAndTimeOrder[0];
          }
          return deadGuy;
    };

      if(self.isInNight(self.currentRound)){
          
          // check mafia votes 
          var mafiasAlive = _.filter(playersAlive, (p)=>{ return (p.role==constants.CHARACTERS.MAFIA.role) });
          var nonMafiasAlive = _.filter(playersAlive, (p)=>{ return (p.role!=constants.CHARACTERS.MAFIA.role) });
          deadGuy = pickDeadGuyFromVotes(mafiasAlive, nonMafiasAlive);

          // check doctors choice
          var doctor = _.find(playersAlive, (p)=>{ return (p.role==constants.CHARACTERS.DOCTOR.role) });
          if(doctor && doctor.vote) {
              // update doctors choice on player/db

              if(deadGuy.username == doctor.vote){
                deadGuy.doctorHealed = true;
              }

              // self healing
              if(doctor.vote == doctor.username){
                self.doctorHealedHimSelf(doctor, gameCode);
              }
              
          }

      } else {
        deadGuy = pickDeadGuyFromVotes(playersAlive, playersAlive);
      }

      return deadGuy ? _.extend(deadGuy, self.players[deadGuy.username]) : null;

  };

  self.doctorHealedHimSelf = (player, gameCode) => {
      if(player.role==constants.CHARACTERS.DOCTOR.role){
        self.players[player.username].healedBefore = true;
        // update DB
        self.updatePlayerOnDB(self.db, gameCode, player.username, {
            healedBefore: true
        });
      }
  }

  pub.resume = function(params){
    params = params || {};

      var db = params.db || db;
      self.userMsgQueue = params.userMsgQueue || self.userMsgQueue;
      self.db = db;

      self.updateTimeLimits();

    db.collection('configurations').findOne({
        key : "gameHosted",
        "value.running" : true,
      }, function(err, game){
        if(game && game.value && game.value.code){
            var gameVal = game.value;
            var gameCode = gameVal.code;

            self.gameCode = gameCode;

            db.collection('gamePlayers').find({
                gameCode: gameCode
            }).toArray(function(err, players){

                logger.info(`RESUMING THE GAME: ${gameCode}`);

                var combination = pub.getCombination(_.size(players));
                self.combinations = combination;

                self.players = _.keyBy(players, "username");
                self.host = _.find(players, function(p){
                    return p.host;
                });

                if(gameVal.round > 0){
                    // game in the middle

                    // restore...
                    self.currentRound = gameVal.round;
                    self.startRound(db, gameCode, self.currentRound);

                    self.gameInProgress = true;
                } else {
                    self.gameInProgress = false;

                    // if players are not assigned with roles
                    if( self.host && !self.host.role ){
                        // assign roles for players..
                        self.assignPlayerRoles(self.players, self.combinations);
                        self.updatePlayerRolesOnDB(db, gameCode, self.players);
                    }

                    self.currentRound = 1;
                    self.startRound(db, gameCode, self.currentRound);
                    
                }
                
            });
        }
        

      });
  };

  pub.messageIn = function(msg, user, irrelavantCb, cb){
    if(self.gameInProgress && self.players && self.players[user.name]){
        var matchedPlayer = self.players[user.name];

        if(matchedPlayer.host) {
            pub.hostMessages(msg, matchedPlayer, irrelavantCb, cb);
        }

        // dead player msg stops here
        if(matchedPlayer.dead){
            cb(`You died, sitback and watch you bloody ghost... `);
            return;
        }

        if(self.isInNight(self.currentRound)){
            // mafia msgs
            if(matchedPlayer.role == constants.CHARACTERS.MAFIA.role){
                pub.mafiaMessages(msg, matchedPlayer, irrelavantCb, cb);
            }
    
            // doctor or inspector msgs
            if(matchedPlayer.role == constants.CHARACTERS.DOCTOR.role || matchedPlayer.role == constants.CHARACTERS.INSPECTOR.role){
                self.doctorInspectorMessages(msg, matchedPlayer, irrelavantCb, cb);
            }
        } else {
            // during day time all players are same
            self.civilianMessages(msg, matchedPlayer, irrelavantCb, cb);
        }

    } else {
        irrelavantCb();
    }
  };


  pub.hostMessages = function(msg, messagedPlayer, irrelavantCb, cb){
      logger.info(`HOST MSG: ${msg}`);
      if(!self.gameInProgress){
        var msgParts = msg.split(",");
        var combination = {};
        var total = 0;
        _.each(msgParts, function(charCount){
            charCount = charCount || "";
            var charCountExtract = charCount.match(/^\s*([a-z]{1})\s*\-(\d{1,2})\s*$/i);
            if(charCountExtract){
                var charKey = charCountExtract[1].toLowerCase();
                var matchedCharKey = _.findKey(constants.CHARACTERS, (c)=>{ return c.code == charKey });
                if(matchedCharKey){
                    var matchedChar = constants.CHARACTERS[matchedCharKey];
                    var count = parseInt(charCountExtract[2]);
                    combination[matchedCharKey] = {
                        code: matchedChar.code,
                        count: count,
                        character: matchedCharKey
                    };
                    total+=count;
                }
            }
        });

        
        var noOfPlayers = _.size(self.players);
        if(total<=noOfPlayers){
            if(total<noOfPlayers){ // if less fill with civilians
                // add civilians
                var civiliansObj = combination[civilianKey] || {
                    code: constants.CHARACTERS.CIVILIAN.code,
                    count: 0,
                    character: civilianKey
                };

                civiliansObj.count = civiliansObj.count + (noOfPlayers-total);
                combination[civilianKey] = civiliansObj;
            }

            self.combinations = combination;
        } else {
            // provided combination exceeds the total players
            cb("You have seleceted roles more than players...");
        }

      }
  };

  self.markTheVote = (selectedPlayer, votingPlayer)=>{
    self.players[votingPlayer.username].vote = selectedPlayer.username;
    self.players[votingPlayer.username].voteTime = new Date();
    // update the vote on DB
    self.updatePlayerOnDB(self.db, self.gameCode, votingPlayer.username, {
        vote: selectedPlayer.username,
        voteTime: new Date()
    });

    // if all have voted and check remaining time is less than 10s go for early round closure in 10s
    var nowDate   = new Date();
    var secondsRemainning = (nowDate.getTime() - self.endRoundTimerStartedAt.getTime()) / 1000;
    if(secondsRemainning > LAST_X_SECONDS_FOR_VOTING){
        // if all have voted
        var votersNotVoted = null;
        if(self.isInNight(self.round)){
            votersNotVoted = _.filter(self.players, (p)=> { return (!p.dead && p.role!=constants.CHARACTERS.CIVILIAN.role && !p.vote ) });
        } else {
            votersNotVoted = _.filter(self.players, (p)=> { return (!p.dead && !p.vote ) });
        }

        if(_.size(votersNotVoted)==0){
            // all voted so close early
            if(self.endRoundTimer){
                clearTimeout(self.endRoundTimer);
                self.endRoundTimer=0;
            }
            if(self.lastXSecondsTimer){
                clearTimeout(self.lastXSecondsTimer);
                self.lastXSecondsTimer=0;
            }

            // set timer to close voting early
            setTimeout(() => {
                _.each(self.players, (player)=>{
                    self.userMsgQueue.addToQueue({
                        username: player.username,
                        attachments: [
                        {
                            "color": constants.MESSAGE_COLORS.ORANGE,
                            "title": "ALL VOTED, EARLY CLOSURE...",
                            "text": `All players have voted therefore this round will end early in ${LAST_X_SECONDS_FOR_VOTING} seconds..`,
                            "fields": [],
                            "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                        },
                        ]                      
                    });
                });
            }, LAST_X_SECONDS_FOR_VOTING*1000 );
        }
    }

  };



  self.getPlayerFromMessageResponse = (msg, messagedPlayer)=>{
    var slackIdExtract = msg.match(/\s*\<\@([\w]*)\>\s*/i) || [];
    var slackId = slackIdExtract[1];
    if(!slackId){
        return null;
    }
    // to be added after testing - && p.username!=messagedPlayer.username
    return _.find(self.players, (p)=>{ return ( !p.dead && p.slackUserId == slackId ) });
  }

  pub.mafiaMessages = (msg, messagedPlayer, irrelavantCb, cb) => {
    var selectedPlayer = self.getPlayerFromMessageResponse(msg, messagedPlayer);

    if( selectedPlayer && (selectedPlayer.username == messagedPlayer.username || selectedPlayer.role == constants.CHARACTERS.MAFIA.role ) ){
        cb("Seems like you are the dumbest mafia in this planet... please select someone else.");
    } else if(selectedPlayer) {
        cb(`You just marked <@${selectedPlayer.slackUserId}> to be killed.`);
        
        // inform other mafias
        var currentVote = messagedPlayer.vote;
        if(currentVote != selectedPlayer.vote){
            var otherMafiasAlive = _.filter(self.players, (p)=>{ return ( p.username!=messagedPlayer.username && !p.dead && p.role==constants.CHARACTERS.MAFIA.role) });
            _.each(otherMafiasAlive, function(player){
                self.userMsgQueue.addToQueue({
                    username: player.username,
                    attachments: [
                    {
                        "color": constants.MESSAGE_COLORS.GREEN,
                        "title": "LET'S KILL !!!",
                        "text": `<@${messagedPlayer.slackUserId}> wants to kill <@${selectedPlayer.slackUserId}>`,
                        "fields": [],
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    },
                    ]                           
                });
            });
        }
        
        // mark the vote
        self.markTheVote(selectedPlayer, messagedPlayer);

    } else {
        cb("You just have to select a live non-mafia player in this game... @playername");
    }
    
  };


  self.doctorInspectorMessages =  (msg, messagedPlayer, irrelavantCb, cb)=>{
    var selectedPlayer = self.getPlayerFromMessageResponse(msg, messagedPlayer);
    var action = (messagedPlayer.role == constants.CHARACTERS.DOCTOR.role) ? "healed":"inspected";
    
    if(messagedPlayer.role == constants.CHARACTERS.DOCTOR.role && selectedPlayer.username==messagedPlayer.username && messagedPlayer.healedBefore){
        cb(`You can heal yourself only once in a game as the doctor.`);
    } else if(messagedPlayer.role == constants.CHARACTERS.INSPECTOR.role && selectedPlayer.username==messagedPlayer.username ){
        cb(`Hellow inspector, are you trying to inspect yourself.. :o , such a dumb person to get this designation.`);
    } else if(selectedPlayer){
        self.markTheVote(selectedPlayer, messagedPlayer);
        cb(`You just marked <@${selectedPlayer.slackUserId}> to be ${action}.`);
    } else {
        cb(`You just have to select a live player in this game to be ${action}... @playername`);
    }
  }


  self.civilianMessages = (msg, messagedPlayer, irrelavantCb, cb)=>{
    var selectedPlayer = self.getPlayerFromMessageResponse(msg, messagedPlayer);
    if(selectedPlayer){
        var currentVote = messagedPlayer.vote;
        
        // inform other live players
        if(currentVote != selectedPlayer.username){
            var playersAlive = _.filter(self.players, (p)=>{ return !p.dead });
            _.each(playersAlive, function(player){
                self.userMsgQueue.addToQueue({
                    username: player.username,
                    attachments: [
                    {
                        "color": constants.MESSAGE_COLORS.GREEN,
                        "title": "LET'S EXECUTE !!!",
                        "text": `<@${messagedPlayer.slackUserId}> wants to execute <@${selectedPlayer.slackUserId}>`,
                        "fields": [],
                        "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                    },
                    ]                           
                });
            });
        }
        

        self.markTheVote(selectedPlayer, messagedPlayer);
        cb(`You just voted for <@${selectedPlayer.slackUserId}> to be executed by the villagers.`);

    } else {
        cb(`You just have to select a live player in this game to vote for the execution... @playername`);
    }
  };

  return pub;
})();

module.exports = GamePlay;



