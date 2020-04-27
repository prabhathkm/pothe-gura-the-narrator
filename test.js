var constants   = require('./constants');
var gamePlay   = require('./lib/game-play');


var count = 6;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

var count = 10;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

var count = 15;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

var count = 24;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

var count = 35;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

var count = 60;
console.log(` Players: ${count} comb: ${JSON.stringify(gamePlay.getCombination(count))} `);

