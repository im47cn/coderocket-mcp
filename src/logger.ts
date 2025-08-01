import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志条目接口
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * 简单的日志记录器
 */
export class Logger {
  private logLevel: LogLevel;
  private logFile?: string;

  constructor(level: LogLevel = LogLevel.INFO, logFile?: string) {
    this.logLevel = level;
    this.logFile = logFile;

    // 如果没有指定日志文件，使用临时目录
    if (!this.logFile) {
      this.logFile = join(tmpdir(), 'coderocket-mcp.log');
    }
  }

  /**
   * 记录调试信息
   */
  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 记录信息
   */
  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 记录警告
   */
  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * 记录错误
   */
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * 核心日志记录方法
   */
  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error,
  ) {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // 在 MCP 服务器模式下，只有在 DEBUG 模式或 WARN/ERROR 级别时才输出到控制台
    // 这避免了 IDE 误认为 INFO 级别的日志是错误信息
    const shouldOutputToConsole =
      process.env.DEBUG === 'true' || level >= LogLevel.WARN;

    if (shouldOutputToConsole) {
      const levelName = LogLevel[level];
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      const errorStr = error ? ` Error: ${error.message}` : '';

      // 所有控制台输出都使用 stderr 以避免污染 MCP 协议的 stdout
      console.error(
        `[${entry.timestamp}] ${levelName}: ${message}${contextStr}${errorStr}`,
      );
    }

    // 写入日志文件
    if (this.logFile) {
      try {
        // 处理 Error 对象，避免循环结构
        let logEntry = entry;
        if (entry.error instanceof Error) {
          logEntry = {
            ...entry,
            error: {
              name: entry.error.name,
              message: entry.error.message,
              stack: entry.error.stack,
            },
          };
        }
        const logLine = JSON.stringify(logEntry) + '\n';
        await appendFile(this.logFile, logLine, 'utf-8');
      } catch (fileError) {
        console.error('Failed to write to log file:', fileError);
      }
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFile(): string | undefined {
    return this.logFile;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel) {
    this.logLevel = level;
  }
}

// 全局日志实例
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
);

/**
 * 错误处理工具类
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理并格式化错误
   */
  handleError(error: unknown, context?: string): Error {
    let formattedError: Error;

    if (error instanceof Error) {
      formattedError = error;
    } else if (typeof error === 'string') {
      formattedError = new Error(error);
    } else {
      formattedError = new Error(`Unknown error: ${JSON.stringify(error)}`);
    }

    // 记录错误
    this.logger.error(
      `${context ? `[${context}] ` : ''}${formattedError.message}`,
      formattedError,
      { context },
    );

    return formattedError;
  }

  /**
   * 包装异步函数，自动处理错误
   */
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string,
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handleError(error, context);
      }
    };
  }

  /**
   * 创建用户友好的错误消息
   */
  createUserFriendlyError(
    error: Error,
    suggestions?: string[],
  ): {
    error: string;
    error_code: string;
    suggestions: string[];
  } {
    // 根据错误类型提供不同的错误代码和建议
    let errorCode = 'UNKNOWN_ERROR';
    let userSuggestions = suggestions || [];

    if (error.message.includes('Shell command failed')) {
      errorCode = 'SHELL_COMMAND_ERROR';
      userSuggestions = [
        '验证AI服务是否已配置',
        '检查API密钥是否正确设置',
        '确保有足够的权限执行命令',
        ...userSuggestions,
      ];
    } else if (
      error.message.includes('AI服务') ||
      error.message.includes('AI service')
    ) {
      errorCode = 'AI_SERVICE_ERROR';
      userSuggestions = [
        '检查AI服务配置',
        '验证API密钥是否正确',
        '确保网络连接正常',
        '尝试切换到其他AI服务',
        ...userSuggestions,
      ];
    } else if (
      error.message.includes('文件') ||
      error.message.includes('file')
    ) {
      errorCode = 'FILE_ERROR';
      userSuggestions = [
        '检查文件路径是否正确',
        '确保文件存在且可读',
        '验证文件权限',
        ...userSuggestions,
      ];
    } else if (error.message.includes('Git') || error.message.includes('git')) {
      errorCode = 'GIT_ERROR';
      userSuggestions = [
        '确保在Git仓库中执行',
        '检查Git仓库状态',
        '验证提交哈希是否存在',
        ...userSuggestions,
      ];
    }

    return {
      error: error.message,
      error_code: errorCode,
      suggestions: userSuggestions,
    };
  }
}

// 全局错误处理器实例
export const errorHandler = new ErrorHandler(logger);
