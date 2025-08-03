import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { AIService } from '../types.js';
import { logger } from '../logger.js';

/**
 * 独立配置管理类
 *
 * 支持多层级配置加载：
 * 1. 环境变量（最高优先级）
 * 2. 项目级 .env 文件
 * 3. 全局 ~/.coderocket/env 文件
 * 4. 默认值（最低优先级）
 */
export class ConfigManager {
  private static config: Record<string, any> = {};
  private static initialized = false;

  /**
   * 初始化配置系统
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // 加载默认配置
    this.loadDefaults();

    // 加载全局配置文件
    await this.loadGlobalConfig();

    // 加载项目配置文件
    await this.loadProjectConfig();

    // 加载环境变量（最高优先级）
    this.loadEnvironmentVariables();

    this.initialized = true;
    logger.info('配置系统初始化完成', { config: this.getSafeConfig() });
  }

  /**
   * 检查是否已初始化（安全方法）
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 加载默认配置
   */
  private static loadDefaults(): void {
    this.config = {
      AI_SERVICE: 'gemini',
      AI_AUTO_SWITCH: 'true',
      AI_TIMEOUT: '30',
      AI_MAX_RETRIES: '3',
      AI_RETRY_DELAY: '2',
      AI_LANGUAGE: 'zh-CN',
      NODE_ENV: 'production',
      DEBUG: 'false',
      GEMINI_MODEL: 'gemini-1.5-flash',
      CLAUDE_MODEL: 'claude-3-sonnet-20240229',
      FILE_CONTENT_CHAR_LIMIT: '5000',
    };
  }

  private static async loadGlobalConfig(): Promise<void> {
    try {
      const globalConfigPath = join(homedir(), '.coderocket', 'env');
      const content = await readFile(globalConfigPath, 'utf-8');
      const globalConfig = this.parseEnvContent(content);
      Object.assign(this.config, globalConfig);
      logger.debug('全局配置加载成功', { path: globalConfigPath });
    } catch (error) {
      // 全局配置文件不存在是正常的
      logger.debug('全局配置文件不存在，跳过');
    }
  }

  /**
   * 加载项目配置文件 .env
   */
  private static async loadProjectConfig(): Promise<void> {
    try {
      const projectConfigPath = join(process.cwd(), '.env');
      const content = await readFile(projectConfigPath, 'utf-8');
      const projectConfig = this.parseEnvContent(content);
      Object.assign(this.config, projectConfig);
      logger.debug('项目配置加载成功', { path: projectConfigPath });
    } catch (error) {
      // 项目配置文件不存在是正常的
      logger.debug('项目配置文件不存在，跳过');
    }
  }

  /**
   * 加载环境变量（最高优先级）
   */
  private static loadEnvironmentVariables(): void {
    const envKeys = [
      'AI_SERVICE',
      'AI_AUTO_SWITCH',
      'AI_TIMEOUT',
      'AI_MAX_RETRIES',
      'AI_RETRY_DELAY',
      'GEMINI_API_KEY',
      'CLAUDE_API_KEY',
      'NODE_ENV',
      'DEBUG',
    ];

    envKeys.forEach(key => {
      if (process.env[key]) {
        this.config[key] = process.env[key];
      }
    });
  }

  /**
   * 解析 .env 文件内容
   */
  static parseEnvContent(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // 移除引号
          config[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }

    return config;
  }

  /**
   * 获取配置值
   */
  static get(key: string, defaultValue?: any): any {
    if (!this.initialized) {
      throw new Error('ConfigManager 未初始化，请先调用 initialize()');
    }
    return this.config[key] ?? defaultValue;
  }

  /**
   * 获取API密钥环境变量名
   */
  static getAPIKeyEnvVar(service: AIService): string {
    const envVarMap: Record<AIService, string> = {
      gemini: 'GEMINI_API_KEY',
      claudecode: 'CLAUDE_API_KEY',
    };
    return envVarMap[service];
  }

  /**
   * 获取API密钥
   */
  static getAPIKey(service: AIService): string {
    const envVar = this.getAPIKeyEnvVar(service);
    return this.get(envVar, '');
  }

  /**
   * 获取AI服务配置
   */
  static getAIService(): AIService {
    const service = this.get('AI_SERVICE', 'gemini').toLowerCase();
    if (['gemini', 'claudecode'].includes(service)) {
      return service as AIService;
    }
    return 'gemini';
  }

  /**
   * 获取超时配置
   */
  static getTimeout(): number {
    return parseInt(this.get('AI_TIMEOUT', '30'), 10);
  }

  /**
   * 获取最大重试次数
   */
  static getMaxRetries(): number {
    return parseInt(this.get('AI_MAX_RETRIES', '3'), 10);
  }

  /**
   * 是否启用自动切换
   */
  static isAutoSwitchEnabled(): boolean {
    return this.get('AI_AUTO_SWITCH', 'true').toLowerCase() === 'true';
  }

  /**
   * 获取AI服务语言设置
   */
  static getAILanguage(): string {
    return this.get('AI_LANGUAGE', 'zh-CN');
  }

  /**
   * 获取安全的配置信息（隐藏敏感信息）
   */
  private static getSafeConfig(): Record<string, any> {
    const safeConfig = { ...this.config };
    // 隐藏API密钥
    Object.keys(safeConfig).forEach(key => {
      if (key.includes('API_KEY') || key.includes('TOKEN')) {
        safeConfig[key] = safeConfig[key] ? '***' : undefined;
      }
    });
    return safeConfig;
  }

  /**
   * 获取配置文件路径（保持向后兼容）
   */
  static getConfigPath(scope: string): { dir: string; file: string } {
    const configDir =
      scope === 'global' ? join(homedir(), '.coderocket') : process.cwd();

    const configFile =
      scope === 'global' ? join(configDir, 'env') : join(configDir, '.env');

    return { dir: configDir, file: configFile };
  }
}
