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
            this.onLog(message);
        }

        if(this.printToConsole) {
            console.log(message);
        }
    }
}

export default Logger;