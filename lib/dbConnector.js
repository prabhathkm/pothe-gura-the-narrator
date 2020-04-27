var MongoClient = require("mongodb").MongoClient;

//////////////////////////////
// DB CONNECTOR
// v2.0.0
DbConnector = (function() {
  var self = {};
  var pub = {};

  var dbTag = 'bototDb';

  //db connection links from settings
  self.link = {};
  self.link[dbTag] = "mongodb://127.0.0.1:27017/mafia";

  // New connection
  self.createConnectionGeneric = function( connectionLinkTag ,cb){
    MongoClient.connect( self.link[connectionLinkTag], function(err, db) {
      if (err) {
        console.log('[DbConnector] ## Failed to connect '+connectionLinkTag+' : ' + err);
        cb('Failed to connect '+connectionLinkTag+' : ' + err, db);
      } else {
        console.log('[DbConnector] ## Connection created to '+connectionLinkTag+' , '+self.link[connectionLinkTag]+'.');
        self[connectionLinkTag] = db;
        self[connectionLinkTag].close = function(){
          console.log('[DbConnector] ##  '+connectionLinkTag+' close called');
          self[connectionLinkTag]=null;
        };
        cb(null, self[connectionLinkTag]);
      }
    });
  };

  // Serve Generic connection
  self.getGenericConnection = function( dbRelatedTag ,cb){
    if(self[dbRelatedTag]){
      cb(null, self[dbRelatedTag]);
    }
    else{
      self.createConnectionGeneric(dbRelatedTag, function(err,db){
        cb(err,db);
      })
    }
  };

  // Serve connection
  pub.getDbConnection = function(cb){
    self.getGenericConnection( dbTag, cb);
  };


  return pub;
})();

module.exports = DbConnector;