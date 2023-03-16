class Logger {
    constructor(onLog, printToConsole = false) {
        this.onLog = onLog;
        this.printToConsole = printToConsole;
    }
    log(message) {
        if(this.onLog) {
            this.onLog(message);
        }

        if(this.printToConsole) {
            console.log(message);
        }
    }
}

export default Logger;