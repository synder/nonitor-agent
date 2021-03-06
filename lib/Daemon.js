/**
 * Created by synder on 16/1/6.
 */

var path = require('path');
var util = require('util');
var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter;

var Daemon = function(){

    EventEmitter.call(this);

    this.__workers = {};

    var self = this;

    process.on('exit', function(code){
        if(code == 0){
            self.stop('all');
        }
    });
};

util.inherits(Daemon, EventEmitter);

/**
 * @desc get all workers
 * */
Daemon.prototype.workers = function(){
    return this.__workers;
};

/**
 * @desc start a child module with daemon
 * */
Daemon.prototype.start = function(module, args, options, callback){

    var self = this;

    module = path.normalize(module);

    if(self.__workers[module]){
        if(self.__workers[module].exit){
            self.__workers[module].exit(0);
        }
        delete self.__workers[module];
    }

    var childProcess = child_process.fork(module, args, options);

    childProcess.module = {
        path : module,
        pid : childProcess.pid
    };

    childProcess.on('error', function(err){
        callback && callback(err);
    });

    childProcess.on('exit', function (code) {
        if (code != 0) {
            self.start(module, args, options, function(){
                callback && callback(new Error(childProcess.module.path + ' exit'));
            });
        }
    });

    self.__workers[module] = childProcess;

    return childProcess;
};

/**
 * @desc stop one or all child process
 * */
Daemon.prototype.stop = function(module){

    var self = this;

    if(!module) {
        for (var key in self.__workers) {
            if (self.__workers[key].exit) {
                self.__workers[key].exit(0);
            }
            delete self.__workers[key];
        }

        return true;
    }

    module = path.normalize(module);

    if(self.__workers[module]){
        if(self.__workers[module].exit){
            self.__workers[module].exit(0);
        }
        delete self.__workers[module];

        return true;
    }

    return false;
};

/**
 * @desc send message to one or all module
 * */
Daemon.prototype.message = function(module, message){

    var childProcess = this.__workers[module];

    if(childProcess){
        childProcess.send(message);
    }
};

/**
 * @desc receive message from on or all module
 * */
Daemon.prototype.receive = function(module, callback){
    var childProcess = this.__workers[module];

    if(childProcess){
        childProcess.on('message', callback);
    }
};


module.exports = Daemon;
