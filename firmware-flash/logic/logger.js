class Logger {
    // Enum for log levels
    static get LOG_LEVEL() {
        return {
            DEBUG: 0,
            INFO: 1,
            WARNING: 2,
            ERROR: 3,
            NONE: 4
        };
    }

    constructor(onLog, printToConsole = false, logLevel = Logger.LOG_LEVEL.INFO) {
        this.onLog = onLog;
        this.printToConsole = printToConsole;
        this.logLevel = logLevel;
    }

    log(message, level = Logger.LOG_LEVEL.INFO) {
        if(level < this.logLevel) {
            return;
        }

        if(this.onLog) {
            this.onLog(message, level);
        }

        if(this.printToConsole) {
            if(level === Logger.LOG_LEVEL.ERROR) {
                console.error(message);
            } else {
                console.log(message);
            }
        }
    }
}

export default Logger;