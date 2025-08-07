import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { AIService } from '../types.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { AIServiceError, logger } from '../logger.js';

/**
 * 智能AI服务管理器
 *
 * 功能：
 * 1. 多AI服务支持（Gemini、ClaudeCode）
 * 2. 智能故障转移
 * 3. 自动重试机制
 * 4. 服务状态监控
 */
export class SmartAIManager {
  private geminiClient?: GoogleGenerativeAI;
  private claudeClient?: Anthropic;
  private serviceStatus: Map<AIService, boolean> = new Map();

  constructor() {
    // 不在构造函数中初始化客户端，而是在需要时懒加载
    // 这样可以确保 ConfigManager 已正确加载配置
  }

  /**
   * 初始化AI客户端（懒加载）
   */
  private initializeClients(): void {
    // 强制重新初始化 ConfigManager 以确保最新配置
    ConfigManager.initialize(true).then(() => {
      this.initializeGeminiClient();
      this.initializeClaudeClient();
    }).catch(error => {
      logger.error('ConfigManager 重新初始化失败', error);
    });
  }

  /**
   * 初始化 Gemini 客户端
   */
  private initializeGeminiClient(): void {
    const geminiKey = ConfigManager.getAPIKey('gemini');
    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(geminiKey);
        // 初始化时先标记为可用，实际可用性通过 testService 检测
        this.serviceStatus.set('gemini', true);
        logger.debug('Gemini 客户端初始化成功');
      } catch (error) {
        logger.warn('Gemini 客户端初始化失败', { error: error instanceof Error ? error.message : String(error) });
        this.serviceStatus.set('gemini', false);
      }
    } else {
      // 没有 API 密钥时标记为不可用
      this.serviceStatus.set('gemini', false);
    }
  }

  /**
   * 初始化 Claude 客户端
   */
  private initializeClaudeClient(): void {

    const claudeKey = ConfigManager.getAPIKey('claudecode');
    if (claudeKey) {
      try {
        this.claudeClient = new Anthropic({ apiKey: claudeKey });
        this.serviceStatus.set('claudecode', true);
        logger.debug('Claude 客户端初始化成功');
      } catch (error) {
        logger.warn('Claude 客户端初始化失败', { error: error instanceof Error ? error.message : String(error) });
        this.serviceStatus.set('claudecode', false);
      }
    } else {
      this.serviceStatus.set('claudecode', false);
    }
  }

  /**
   * 智能调用AI服务（带故障转移）
   */
  async intelligentCall(
    primaryService: AIService,
    prompt: string
  ): Promise<{ result: string; usedService: AIService }> {
    const maxRetries = ConfigManager.getMaxRetries();
    const timeout = ConfigManager.getTimeout() * 1000; // 转换为毫秒
    const autoSwitch = ConfigManager.isAutoSwitchEnabled();

    // 首先尝试主要服务
    try {
      const result = await this.callWithTimeout(primaryService, prompt, timeout);
      return { result, usedService: primaryService };
    } catch (error) {
      logger.warn(`主要AI服务 ${primaryService} 调用失败`, {
        error: error instanceof Error ? error.message : String(error),
      });

      // 如果启用自动切换，尝试备用服务
      if (autoSwitch) {
        const fallbackService = this.getFallbackService(primaryService);
        if (fallbackService && this.isServiceAvailable(fallbackService)) {
          try {
            logger.info(`切换到备用AI服务: ${fallbackService}`);
            const result = await this.callWithTimeout(
              fallbackService,
              prompt,
              timeout
            );
            return { result, usedService: fallbackService };
          } catch (fallbackError) {
            logger.error(`备用AI服务 ${fallbackService} 也失败`, fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
          }
        }
      }

      // 如果所有服务都失败，抛出错误
      throw new AIServiceError(
        `所有AI服务都不可用。主要服务 ${primaryService} 错误: ${error instanceof Error ? error.message : String(error)}`,
        primaryService
      );
    }
  }

  /**
   * 带超时的AI服务调用
   */
  private async callWithTimeout(
    service: AIService,
    prompt: string,
    timeout: number
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new AIServiceError(`AI服务调用超时 (${timeout}ms)`, service));
      }, timeout);

      try {
        const result = await this.callAIService(service, prompt);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * 调用指定的AI服务
   */
  private async callAIService(service: AIService, prompt: string): Promise<string> {
    if (!this.isServiceAvailable(service)) {
      throw new AIServiceError(`AI服务 ${service} 不可用`, service);
    }

    switch (service) {
      case 'gemini':
        return await this.callGemini(prompt);
      case 'claudecode':
        return await this.callClaude(prompt);
      default:
        throw new AIServiceError(`不支持的AI服务: ${service}`, service);
    }
  }

  /**
   * 调用 Gemini API
   */
  private async callGemini(prompt: string): Promise<string> {
    if (!this.geminiClient) {
      throw new AIServiceError('Gemini 客户端未初始化', 'gemini');
    }

    try {
      const model = this.geminiClient.getGenerativeModel({
        model: ConfigManager.get('GEMINI_MODEL', 'gemini-1.5-flash'),
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new AIServiceError('Gemini 返回空响应', 'gemini');
      }

      return text;
    } catch (error) {
      throw new AIServiceError(`Gemini API 调用失败: ${error instanceof Error ? error.message : String(error)}`, 'gemini');
    }
  }

  /**
   * 调用 Claude API
   */
  private async callClaude(prompt: string): Promise<string> {
    if (!this.claudeClient) {
      throw new AIServiceError('Claude 客户端未初始化', 'claudecode');
    }

    try {
      const response = await this.claudeClient.messages.create({
        model: ConfigManager.get('CLAUDE_MODEL', 'claude-3-sonnet-20240229'),
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new AIServiceError('Claude 返回非文本响应', 'claudecode');
      }

      return content.text;
    } catch (error) {
      throw new AIServiceError(`Claude API 调用失败: ${error instanceof Error ? error.message : String(error)}`, 'claudecode');
    }
  }

  /**
   * 获取备用服务
   */
  private getFallbackService(primaryService: AIService): AIService | null {
    const fallbackMap: Record<AIService, AIService> = {
      gemini: 'claudecode',
      claudecode: 'gemini',
    };
    return fallbackMap[primaryService] || null;
  }

  /**
   * 检查服务是否可用
   */
  isServiceAvailable(service: AIService): boolean {
    return this.serviceStatus.get(service) === true;
  }

  /**
   * 获取所有服务状态
   */
  getServiceStatus(): Record<AIService, boolean> {
    return Object.fromEntries(this.serviceStatus) as Record<AIService, boolean>;
  }

  /**
   * 测试服务连接
   */
  async testService(service: AIService): Promise<boolean> {
    // 首先检查服务是否已配置（有 API 密钥）
    const apiKey = ConfigManager.getAPIKey(service);
    if (!apiKey) {
      this.serviceStatus.set(service, false);
      logger.debug(`AI服务 ${service} 未配置 API 密钥`);
      return false;
    }

    try {
      // 使用简单的测试提示词，设置较短的超时时间
      await this.callAIService(service, '测试');
      this.serviceStatus.set(service, true);
      logger.debug(`AI服务 ${service} 连接测试成功`);
      return true;
    } catch (error) {
      // 连接失败时不修改状态，保持配置状态
      // 这样用户仍然可以看到服务已配置，只是当前不可用
      logger.warn(`AI服务 ${service} 连接测试失败，但服务已配置`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 刷新所有服务状态
   */
  async refreshServiceStatus(): Promise<void> {
    const services: AIService[] = ['gemini', 'claudecode'];

    // 首先重新初始化客户端以确保使用最新配置
    this.initializeClients();

    // 等待一小段时间让异步初始化完成
    await new Promise(resolve => setTimeout(resolve, 200));

    // 基于配置状态初始化服务状态
    services.forEach(service => {
      const apiKey = ConfigManager.getAPIKey(service);
      if (apiKey) {
        // 有 API 密钥则标记为已配置（可能可用）
        this.serviceStatus.set(service, true);
      } else {
        // 没有 API 密钥则标记为不可用
        this.serviceStatus.set(service, false);
      }
    });

    // 然后异步测试实际连接状态（不阻塞响应）
    Promise.all(services.map(service => this.testService(service))).catch(error => {
      logger.warn('服务状态测试过程中出现错误', { error: error instanceof Error ? error.message : String(error) });
    });
  }

  /**
   * 获取可用的服务列表
   */
  getAvailableServices(): AIService[] {
    return Array.from(this.serviceStatus.entries())
      .filter(([, available]) => available)
      .map(([service]) => service);
  }

  /**
   * 重新初始化客户端（用于配置更新后）
   */
  reinitialize(): void {
    this.initializeClients();
  }
}
