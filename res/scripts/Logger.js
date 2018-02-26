const LOGLEVEL_DEBUG = 0;
const LOGLEVEL_INFO = 1;
const LOGLEVEL_WARNING = 2;
const LOGLEVEL_ERROR = 3;
const LOGLEVEL_CRASH = 4;

const LOGLEVEL_NAME = ["DEBUG", "INFO", "WARNING", "ERROR", "CRASH"];

class __Logger {

    constructor() {
        this.minLevel = LOGLEVEL_DEBUG;
    }

    log (logLevel, ...params) {
        if(logLevel >= this.minLevel) {
            var message = util.format.apply(util,params);
            console.log("[" + new Date().toLocaleTimeString() + "] " +  LOGLEVEL_NAME[logLevel] + " | " + message);
        }
    }
}

var Logger = new __Logger();