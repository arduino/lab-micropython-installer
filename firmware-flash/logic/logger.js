let defaultLogger;

class Logger {

    static get defaultLogger() {
        if(!defaultLogger) {
            defaultLogger = new Logger();
        }
        return defaultLogger;
    }

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

    constructor(onLog = null, printToConsole = true, logLevel = Logger.LOG_LEVEL.INFO) {
        this.onLogCallback = onLog;
        this.printToConsole = printToConsole;
        this.logLevel = logLevel;
    }

    set onLog(onLogCallback) {
        this.onLogCallback = onLogCallback;
    }

    setLogLevel(logLevel) {
        this.logLevel = logLevel;
    }


    log(message, level = Logger.LOG_LEVEL.INFO) {
        if(level < this.logLevel) {
            return;
        }

        if(this.onLogCallback) {
            this.onLogCallback(message, level);
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