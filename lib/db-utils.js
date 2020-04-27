var _        = require('lodash');
var uuid     = require('uuid');
var constants   = require('../constants');
var utils   = require('./utils');

DbUtils = (function() {
  var self = {};
  var pub = {};

  

  /**
   * get configurations from db
   * 
   * @param {*} db 
   * @param {*} cb 
   */
  pub.getConfigurations = function(db, cb){
    db.collection('configurations').find({}).toArray(function(err, resp){
      var config = {};
      _.each(resp, function(param){
        
        if(param){
          config[param.key] = {
            value : param.value,
            params : param.params
          };
        }
          
      });
  
      cb(err, config);
  
    });
  };


  /**
   * set db configurations
   * 
   * @param {*} db 
   * @param {*} configs 
   * @param {*} name 
   * @param {*} val 
   * @param {*} params 
   * @param {*} cb 
   */
  pub.setConfigParam= function(db, configs, name, val, params, cb){
    cb = cb || function(){};
  
    configs[name] = {
        value: val,
        params: params
    };
  
    db.collection('configurations').update({
      key: name
    },{
      $set: configs[name]
    }, { upsert : true }, cb);
  
  };


  pub.getConfigParam = function(configs, name){
    return ((configs||{})[name]||{});
  }

  /**
   * get user from DB
   * 
   * @param {*} db 
   * @param {*} fiter 
   * @param {*} cb 
   */
  pub.getUserFromDb = function(db, fiter, cb){
    db.collection('users').findOne(fiter, cb);
  };

  return pub;
})();

module.exports = DbUtils;
