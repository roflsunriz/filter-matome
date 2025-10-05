import { LogLevel } from '@/types/global-types';

class Logger {
  private static instance: Logger;
  private enabledFiles: Set<string>;
  private disabledFiles: Set<string>;
  private currentLevel: LogLevel = LogLevel.DEBUG;

  private constructor() {
    this.enabledFiles = new Set();
    this.disabledFiles = new Set();
    this.initializeLoggerConfig();
  }

  private initializeLoggerConfig(): void {
    // 使い方
    //this.disableLogging("All");
    //this.enableLogging("watch-history");
    //this.enableLogging("database");
    // ログレベルは最後に設定
    this.setLevel(LogLevel.DEBUG);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private getCallerInfo(): string {
    const error = new Error();
    const stack = error.stack?.split('\n')[3] || '';
    const urlMatch = stack.match(/(?:@|at\s+)https:\/\/www\.nicovideo\.jp\/local\/(.*?\.js:\d+:\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const localMatch = stack.match(/\((.+?)\)/);
    if (localMatch) {
      const fullPath = localMatch[1].split('/');
      return fullPath[fullPath.length - 1].replace(/:\d+:\d+$/, '');
    }
    return 'unknown';
  }

  public enableLogging(filePattern: string): void {
    this.enabledFiles.add(filePattern);
  }

  public disableLogging(filePattern: string): void {
    this.disabledFiles.add(filePattern);
  }

  private shouldLog(filename: string): boolean {
    const isDisabled = [...this.disabledFiles].some(pattern => {
      if (pattern === "All") return true;
      return filename.includes(pattern);
    });
    if (isDisabled) {
      return [...this.enabledFiles].some(pattern => filename.includes(pattern));
    }
    return true;
  }

  private _log(level: LogLevel, args: unknown[]): void {
    if (this.currentLevel < level) return;
    const filename = this.getCallerInfo();
    if (!this.shouldLog(filename)) return;
    const prefix = `[${filename}]`;
    switch (level) {
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.LOG:
        console.log(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
    }
  }

  public info(...args: unknown[]): void {
    this._log(LogLevel.INFO, args);
  }

  public log(...args: unknown[]): void {
    this._log(LogLevel.LOG, args);
  }

  public warn(...args: unknown[]): void {
    this._log(LogLevel.WARN, args);
  }

  public error(...args: unknown[]): void {
    this._log(LogLevel.ERROR, args);
  }

  public debug(...args: unknown[]): void {
    this._log(LogLevel.DEBUG, args);
  }

  public handleError(component: string, method: string, error: unknown): void {
    this.error(`[${component}::${method}] エラーが発生しました:`, error);
    this.debug(component, method, "エラー発生", error);
  }

  public measurePerformance(component: string, method: string, callback: () => void): void {
    const start = performance.now();
    try {
      callback();
    } catch (error) {
      this.handleError(component, method, error);
    } finally {
      const end = performance.now();
      this.debug(component, method, `実行時間: ${end - start}ms`);
    }
  }
}

export const logger = Logger.getInstance();

// グローバルオブジェクトとして公開
window.logger = logger;
