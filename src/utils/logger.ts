type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
    private static instance: Logger;
    private enabled: boolean = true;
    private level: LogLevel = 'info';

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    debug(...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug('[SDK Debug]', ...args);
        }
    }

    info(...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info('[SDK Info]', ...args);
        }
    }

    warn(...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn('[SDK Warning]', ...args);
        }
    }

    error(...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error('[SDK Error]', ...args);
        }
    }
}

export const logger = Logger.getInstance(); 