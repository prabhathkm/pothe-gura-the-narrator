var ThreadedQueueExecutor = require('./index.js');

var queue = new ThreadedQueueExecutor(3, {
    autoStart: false,
    executeFunction: function(obj,done){
        setTimeout(function(){
            console.log('Exec',obj);
            done();
        }, 1000);
    },
    completeFunction: function(){
        console.log('DONE !!!!');
    }
});

queue.setExecuteFunction(function(obj,done){
    setTimeout(function(){
        console.log('Exec 2',obj);
        done();
    }, 1000);
});

queue.setCompleteFunction(function(){
    console.log('DONE 2 !!!!');
});


for(var i=1; i<=10; i++){
    queue.addToQueue({ test: "Test "+i });
}

queue.start();