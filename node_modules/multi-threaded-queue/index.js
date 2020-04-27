/**
 *
 * Handles tasks as a multi-threaded queue
 *
 * @type {Function}
 */
ThreadedQueueExecutor  = (function(size, opt) {
  var self = {};
  var pub = {};

  opt = opt || {};

  // capture settings
  self.autoStart = opt.autoStart || opt.autostart || false;
  self.noOfThreads = size || 1;
  self.tasks = [];
  self.runningThreads = 0;

  // default dummy functions
  self.executeFunction = function (obj, done) {
    console.log('No execution function defined !');
    done();
  };

  self.completeFunction = function(){
    console.log('No complete function defined !.');
  };

  // set functions on init
  self.executeFunction = opt.executeFunction || opt.executefunction || self.executeFunction;
  self.completeFunction = opt.completeFunction || opt.completefunction || self.completeFunction;

  // add object to queue
  pub.addToQueue = function(obj){
    self.tasks.push(obj);
    // auto start if enabled
    if( self.autoStart && self.runningThreads<self.noOfThreads ){
      self.executeThread();
    }
  };

  // set execute function
  pub.setExecuteFunction = function(func){
    self.executeFunction=func;
  };

  //set completion function
  pub.setCompleteFunction = function (func) {
    self.completeFunction=func;
  };

  // execute on thread
  self.executeThread = function () {
    var shifted = self.tasks.shift();
    if(shifted){
      self.runningThreads++;
      self.executeFunction(shifted, function() {
        self.runningThreads--;
        self.checkCompletion();
      });
    }
  };

  // check for completion
  self.checkCompletion = function(){
    if(self.tasks.length===0 && self.runningThreads===0){
      self.completeFunction();
    } else {
      pub.start();
    }
  };

  // start manually
  pub.start = function() {
    var threadsToAdd = self.noOfThreads - self.runningThreads;

    if(threadsToAdd>0){
      if(self.tasks.length < threadsToAdd){
        threadsToAdd = self.tasks.length;
      }
    }

    if(threadsToAdd>0){
      for( var i=0; i<threadsToAdd; i++ ){
        self.executeThread();
      }
    } else {
      if(self.runningThreads===0) {
        self.completeFunction();
      }
    }

  };

  // get queue size
  pub.getQueueSize = function () {
    if(self.tasks && self.tasks.length){
      return self.tasks.length;
    }
    return 0;
  };

  return pub;
});

module.exports = ThreadedQueueExecutor;
