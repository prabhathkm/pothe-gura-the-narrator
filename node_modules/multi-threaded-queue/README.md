# multi-threaded-queue
Pure Javascript, simple multi-threaded queue simulation for nodejs

![diagram](https://raw.githubusercontent.com/prabhathkm/multi-threaded-queue/master/diagram.png "Diagram")


## Usage
```javascript
var multiThreadedQueue = require('multi-threaded-queue');
var queue = new multiThreadedQueue(size, opt);
```
* size: no of simultaneous threads
* opt: { ..optional.. }
 * autoStart: true,  // enable/disable auto start on object insertion, good to use with continuous queue insertion
 * executeFunction: function(obj,next){ .... }, // shorthand for execute function, def. same as below
 * completeFunction: function(){ ... } // shorthand for complete function, def. same as below

```javascript
// on each object
queue.setExecuteFunction(function(obj,next){
    // perform tasks with picked obj from queue
    .......

    // move to the next on the queue
    next();
});


// on completion
queue.setCompleteFunction(function(){
    // triggered on queue completion
    .......
});

// add objects to the queue
queue.addToQueue(obj);
queue.addToQueue(obj);
.......
queue.addToQueue(obj);

// start processing the queue (not needed if autoStart enabled)
queue.start();
```


## Tests
npm test


## Release History
* 1.0.0 Initial release
* 1.1.0 Optimizations
* 1.2.0 GetQueueSize implemented
