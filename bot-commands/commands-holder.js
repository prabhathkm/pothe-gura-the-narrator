var _         = require('lodash');

function CommandsHolder() {
  var self = {};
  var pub = {};

  self.params = {};
  self.commands = [];

  pub.getParams = function(){
    return self.params;
  };

  pub.setParams = function(paramsIn){
    self.params = paramsIn;
  };

  pub.addCommand = function(cmd){
    self.commands.push(cmd);
  };
  
  pub.getCommands = function(){
    return self.commands;
  };

  return pub;

};

module.exports = new CommandsHolder();