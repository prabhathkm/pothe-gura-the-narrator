var constants   = require('./constants');
var gamePlay   = require('./lib/game-play');
var _ = require('lodash');
var dbConnector = require('./lib/dbConnector');

// var count = 6;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

// var count = 10;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

// var count = 15;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

// var count = 24;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

// var count = 35;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

// var count = 60;
// console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);




var votes_1_night = [
    {
      "username": "prabhaths3",
      "slackUserId": "UP5T3J7HN3",
      "host": null,
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths10",
      "slackUserId": "UP5T3J7HN10",
      "host": null,
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths9",
      "slackUserId": "UP5T3J7HN9",
      "host": null,
      "role": "INSPECTOR",
      "vote": "prabhaths3",
      "voteTime": "2020-05-03T12:57:25.981Z"
    },
    {
      "username": "prabhaths1",
      "slackUserId": "UP5T3J7HN1",
      "host": null,
      "vote": "prabhaths9",
      "role": "MAFIA",
      "voteTime": "2020-05-03T12:57:22.981Z"
    },
    {
      "username": "prabhaths",
      "slackUserId": "UP5T3J7HN",
      "host": true,
      "vote": "prabhaths9",
      "role": "MAFIA",
      "voteTime": "2020-05-03T12:57:23.981Z"
    },
    {
      "username": "prabhaths2",
      "slackUserId": "UP5T3J7HN2",
      "host": null,
      "role": "DOCTOR",
      "vote": "prabhaths9",
      "voteTime": "2020-05-03T12:57:25.797Z",
    }
  ];

  var votes_2_day = [
    {
      "username": "prabhaths3",
      "slackUserId": "UP5T3J7HN3",
      "host": null,
      "vote": "prabhaths",
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths10",
      "slackUserId": "UP5T3J7HN10",
      "host": null,
      "vote": "prabhaths3",
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths9",
      "slackUserId": "UP5T3J7HN9",
      "host": null,
      "role": "INSPECTOR",
      "vote": "prabhaths3",
      "voteTime": "2020-05-03T12:57:25.981Z"
    },
    {
      "username": "prabhaths1",
      "slackUserId": "UP5T3J7HN1",
      "host": null,
      "vote": "prabhaths9",
      "role": "MAFIA"
    },
    {
      "username": "prabhaths",
      "slackUserId": "UP5T3J7HN",
      "host": true,
      "vote": "prabhaths9",
      "role": "MAFIA"
    },
    {
      "username": "prabhaths2",
      "slackUserId": "UP5T3J7HN2",
      "host": null,
      "role": "DOCTOR",
      "vote": "prabhaths9",
      "voteTime": "2020-05-03T12:57:25.797Z"
    }
  ];

  var no_votes = [
    {
      "username": "prabhaths3",
      "slackUserId": "UP5T3J7HN3",
      "host": null,
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths10",
      "slackUserId": "UP5T3J7HN10",
      "host": null,
      "role": "CIVILIAN"
    },
    {
      "username": "prabhaths9",
      "slackUserId": "UP5T3J7HN9",
      "host": null,
      "role": "INSPECTOR",
      "voteTime": "2020-05-03T12:57:25.981Z"
    },
    {
      "username": "prabhaths1",
      "slackUserId": "UP5T3J7HN1",
      "host": null,
      "role": "MAFIA"
    },
    {
      "username": "prabhaths",
      "slackUserId": "UP5T3J7HN",
      "host": true,
      "role": "MAFIA"
    },
    {
      "username": "prabhaths2",
      "slackUserId": "UP5T3J7HN2",
      "host": null,
      "role": "DOCTOR",
      "voteTime": "2020-05-03T12:57:25.797Z"
    }
  ];


  

    
    dbConnector.getDbConnection(function dbConCb(dbConErr, db) {
        gamePlay.testSelf.db=db;


        // // test kill
        // var livePlayers = votes_1_night;
        // gamePlay.testSelf.players = _.keyBy(livePlayers, "username");
        // gamePlay.testSelf.currentRound = 1;
        // var deadGuy = gamePlay.testSelf.findWhosDead(livePlayers, "TEST");
        // console.log(deadGuy);



        // test vote simulation
        gamePlay.testSelf.userMsgQueue={
            addToQueue: (msg)=>{
                console.log(`MSG: ${JSON.stringify(msg)}`);
            }
        };
        gamePlay.testSelf.players = _.keyBy(no_votes, "username");
        gamePlay.testSelf.currentRound = 1;
        gamePlay.testSelf.gameInProgress = true;
        gamePlay.testSelf.simulateVotes();
        setTimeout(()=>{
            var deadGuy = gamePlay.testSelf.findWhosDead( _.map(gamePlay.testSelf.players) , "TEST");
            console.log(deadGuy);
        },5000)


    });
    
    






