export interface LoggerInterface {
    error(text: string): void;
    warn(text: string): void;
    log(text: string): void;
    info(text: string): void;
    verbose(text: string): void;
    trace(text: string): void;
}

export class Logger {
    private module: string;
    private level = 2;
    private _VERBOSE = 0;
    private _DEBUG   = 1;
    private _INFO    = 2;
    private _WARN    = 3;
    private _ERROR   = 4;

    constructor(module: string, levelStr = "info") {
        this.module = module;

        switch (levelStr) {
        case "error":   this.level = this._ERROR; break;
        case "warn":    this.level = this._WARN; break;
        case "info":    this.level = this._INFO; break;
        case "debug":   this.level = this._DEBUG; break;
        case "verbose": this.level = this._VERBOSE; break;
        case "trace":   this.level = this._VERBOSE; break;
        default: console.log(`Unexpected level: ${levelStr}, using warn`);
        }
    }

    public error(text: string): void {
        if (this.level <= this._ERROR) {
            console.error(`[${this.module} E] ${text}`);
        }
    }

    public warn(text: string): void {
        if (this.level <= this._WARN) {
            console.log(`[${this.module} W] ${text}`);
        } 
    }

    public log(text: string): void {
        if (this.level <= this._INFO) {
            console.log(`[${this.module} I] ${text}`);
        } 
    }

    public info(text: string): void {
        if (this.level <= this._INFO) {
            console.log(`[${this.module} I] ${text}`);
        } 
    }

    public verbose(text: string): void {
        if (this.level <= this._VERBOSE) {
            console.log(`[${this.module} V] ${text}`);
        } 
    }

    public trace(text: string): void {
        if (this.level <= this._VERBOSE) return;
        console.debug(`[${this.module} V] ${text}`);
    }
}