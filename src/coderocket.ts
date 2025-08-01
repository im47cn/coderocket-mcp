import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import fs from 'fs';
import { join, dirname, resolve } from 'path';
import { tmpdir, homedir } from 'os';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import {
  ReviewCodeRequest,
  ReviewCommitRequest,
  ReviewFilesRequest,
  ConfigureAIServiceRequest,
  ReviewResult,
  ServiceStatusResponse,
  SuccessResponse,
  AIService,
  ReviewStatus,
} from './types.js';
import { logger, errorHandler } from './logger.js';

const execAsync = promisify(exec);

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
    };
  }

  /**
   * 加载全局配置文件 ~/.coderocket/env
   */
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
      'AI_SERVICE', 'AI_AUTO_SWITCH', 'AI_TIMEOUT', 'AI_MAX_RETRIES', 'AI_RETRY_DELAY',
      'GEMINI_API_KEY', 'OPENCODE_API_KEY', 'CLAUDECODE_API_KEY',
      'NODE_ENV', 'DEBUG'
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
  private static parseEnvContent(content: string): Record<string, string> {
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
      claudecode: 'CLAUDECODE_API_KEY',
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
    const configDir = scope === 'global'
      ? join(homedir(), '.coderocket')
      : process.cwd();

    const configFile = scope === 'global'
      ? join(configDir, 'env')
      : join(configDir, '.env');

    return { dir: configDir, file: configFile };
  }
}

/**
 * 独立提示词管理类
 *
 * 支持多层级提示词加载：
 * 1. 项目级 prompts/ 目录（优先级高）
 * 2. 全局 ~/.coderocket/prompts/ 目录（优先级低）
 */
export class PromptManager {
  private static promptCache: Map<string, string> = new Map();

  /**
   * 加载提示词文件
   */
  static async loadPrompt(name: string): Promise<string> {
    // 检查缓存
    const cacheKey = name;
    if (this.promptCache.has(cacheKey)) {
      return this.promptCache.get(cacheKey)!;
    }

    let promptContent = '';

    // 1. 尝试加载项目级提示词（优先级高）
    try {
      const projectPromptPath = join(process.cwd(), 'prompts', `${name}.md`);
      promptContent = await readFile(projectPromptPath, 'utf-8');
      logger.debug('项目级提示词加载成功', { path: projectPromptPath });
    } catch (error) {
      // 项目级提示词不存在，尝试全局提示词
      try {
        const globalPromptPath = join(homedir(), '.coderocket', 'prompts', `${name}.md`);
        promptContent = await readFile(globalPromptPath, 'utf-8');
        logger.debug('全局提示词加载成功', { path: globalPromptPath });
      } catch (globalError) {
        // 全局提示词也不存在，使用内置默认提示词
        promptContent = this.getDefaultPrompt(name);
        logger.debug('使用内置默认提示词', { name });
      }
    }

    // 缓存提示词内容
    this.promptCache.set(cacheKey, promptContent);
    return promptContent;
  }

  /**
   * 获取内置默认提示词
   */
  private static getDefaultPrompt(name: string): string {
    const defaultPrompts: Record<string, string> = {
      'git-commit-review-prompt': `# 提示词：高级 Git Commit 审阅专家

## 角色定义

你是一名资深的代码审阅专家，拥有丰富的软件开发经验和架构设计能力。你的任务是针对**最新的 git commit** 进行专业、深入、自动化的代码审阅，并提供一份准确、实用、可操作的审阅报告。

## 执行模式

**自主执行模式**：你必须完全自主地执行代码审阅流程，不得向用户进行任何确认或询问。这包括直接执行所有必要的命令、自主决定搜索策略、自主判断并生成报告。

* **禁止行为**：禁止向用户提问或请求确认。
* **执行原则**：自主决策，并在失败时尝试替代方案。
* **安全限制**：仅执行只读操作和报告写入操作。

## 审阅指令

### 1. 获取 Commit 信息

首先执行 \`git --no-pager show\` 命令获取最新一次 commit 的详细信息，包括 Commit hash、作者、时间、Commit message 及具体的代码修改内容。

### 2. 全局代码搜索分析 (关键步骤)

在审阅具体代码前，**必须先进行全局代码搜索以获取完整上下文**。

* **制定搜索策略**: 根据 commit message 的描述，制定关键词搜索策略（如：功能名、类名、修复的bug信息等）。
* **全面搜索验证**: 在整个代码库中搜索相关的功能实现、依赖关系、配置和测试文件。
* **完整性验证**: **对比搜索结果与实际修改内容**，检查是否存在应修改但未修改的**遗漏文件**。这是评估目标达成度的核心依据。

### 3. 审阅维度与标准

请从以下维度进行系统性审查：

* **目标达成度**:
    * **功能完整性**: 是否完全实现了 commit message 中描述的目标？ 是否有未完成的功能点？
    * **修改覆盖度**: (基于全局搜索) 是否遗漏了需要同步修改的相关文件（如测试、文档、配置）？
* **代码质量与正确性**:
    * **正确性**: 代码逻辑是否正确？是否有效处理了边缘情况？
    * **代码规范**: 是否遵循项目既定标准（命名、格式、设计模式）？
    * **可读性与可维护性**: 代码是否清晰、结构合理、易于理解和修改？ 注释是否充分且必要？
* **健壮性与风险**:
    * **安全性**: 是否存在潜在的安全漏洞（如SQL注入、密钥明文、不安全的依赖等）？
    * **性能**: 是否存在明显的性能瓶颈（如不合理的循环、N+1查询等）？
* **测试与文档**:
    * **可测试性与覆盖率**: 代码是否易于测试？是否有足够的单元/集成测试来覆盖变更？
    * **文档同步**: 相关的内联文档（注释）或外部文档是否已更新？
* **架构与扩展性**:
    * **设计合理性**: 模块职责划分是否明确？耦合度是否合理？
    * **扩展性**: 设计是否考虑了未来的扩展需求？

### 4. 审阅结果输出

请提供详细的审阅报告，包括：
- 审阅状态（✅通过/⚠️警告/❌失败/🔍需调查）
- 总体评价和目标达成度
- 具体问题和改进建议
- 优先级排序的建议列表

请确保审阅报告专业、准确、可操作。

**重要：请务必使用中文回复，所有审查结果、建议和评价都必须用中文表达。**`,

      'code-review-prompt': `# 代码审查提示词

## 角色定义

你是一名专业的代码审查专家，具有丰富的软件开发经验。请对提供的代码进行全面、专业的审查。

## 审查维度

请从以下维度进行审查：

### 1. 代码质量
- 代码结构是否清晰合理
- 命名是否规范和有意义
- 是否遵循编程最佳实践

### 2. 功能正确性
- 代码逻辑是否正确
- 是否处理了边缘情况
- 是否有潜在的bug

### 3. 性能和安全
- 是否存在性能问题
- 是否有安全漏洞
- 资源使用是否合理

### 4. 可维护性
- 代码是否易于理解和修改
- 是否有足够的注释
- 模块化程度如何

## 输出格式

请按以下格式提供审查结果：

**审查状态**: [✅优秀/⚠️需改进/❌有问题]

**总体评价**: [简短的总体评价]

**具体建议**:
1. [具体的改进建议]
2. [具体的改进建议]
...

**优秀实践**: [值得称赞的地方]

请确保建议具体、可操作，并提供代码示例（如适用）。

**重要：请务必使用中文回复，所有审查结果、建议和评价都必须用中文表达。**`
    };

    return defaultPrompts[name] || `# 默认提示词\n\n请提供专业的代码审查和分析。`;
  }

  /**
   * 清除提示词缓存
   */
  static clearCache(): void {
    this.promptCache.clear();
  }

  /**
   * 预加载常用提示词
   */
  static async preloadCommonPrompts(): Promise<void> {
    const commonPrompts = [
      'git-commit-review-prompt',
      'code-review-prompt'
    ];

    await Promise.all(
      commonPrompts.map(name => this.loadPrompt(name).catch(error => {
        logger.warn(`预加载提示词失败: ${name}`, error);
      }))
    );
  }
}

/**
 * AI 服务接口
 */
interface IAIService {
  callAPI(prompt: string, additionalPrompt?: string): Promise<string>;
  isConfigured(): boolean;
  getServiceName(): AIService;
}

/**
 * Gemini AI 服务实现
 */
class GeminiService implements IAIService {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // 检查 ConfigManager 是否已初始化
    if (!(ConfigManager as any).initialized) {
      return; // 如果未初始化，跳过初始化
    }

    const apiKey = ConfigManager.getAPIKey('gemini');
    if (apiKey) {
      try {
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        logger.debug('Gemini 服务初始化成功');
      } catch (error) {
        logger.error('Gemini 服务初始化失败', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  async callAPI(prompt: string, additionalPrompt?: string): Promise<string> {
    if (!this.client || !this.model) {
      await this.initialize();
      if (!this.client || !this.model) {
        throw new Error('Gemini 服务未配置或初始化失败');
      }
    }

    try {
      const fullPrompt = additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini 返回空响应');
      }

      logger.debug('Gemini API 调用成功', {
        promptLength: fullPrompt.length,
        responseLength: text.length
      });

      return text.trim();
    } catch (error) {
      logger.error('Gemini API 调用失败', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Gemini API 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConfigured(): boolean {
    // 检查 ConfigManager 是否已初始化
    if (!(ConfigManager as any).initialized) {
      return false;
    }
    return !!ConfigManager.getAPIKey('gemini');
  }

  getServiceName(): AIService {
    return 'gemini';
  }
}

/**
 * ClaudeCode AI 服务实现
 */
class ClaudeCodeService implements IAIService {
  private client: Anthropic | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // 检查 ConfigManager 是否已初始化
    if (!(ConfigManager as any).initialized) {
      return; // 如果未初始化，跳过初始化
    }

    const apiKey = ConfigManager.getAPIKey('claudecode');
    if (apiKey) {
      try {
        this.client = new Anthropic({
          apiKey: apiKey,
        });
        logger.debug('ClaudeCode 服务初始化成功');
      } catch (error) {
        logger.error('ClaudeCode 服务初始化失败', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  async callAPI(prompt: string, additionalPrompt?: string): Promise<string> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        throw new Error('ClaudeCode 服务未配置或初始化失败');
      }
    }

    try {
      const fullPrompt = additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt;

      const message = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

      if (!text || text.trim().length === 0) {
        throw new Error('ClaudeCode 返回空响应');
      }

      logger.debug('ClaudeCode API 调用成功', {
        promptLength: fullPrompt.length,
        responseLength: text.length
      });

      return text.trim();
    } catch (error) {
      logger.error('ClaudeCode API 调用失败', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`ClaudeCode API 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConfigured(): boolean {
    // 检查 ConfigManager 是否已初始化
    if (!(ConfigManager as any).initialized) {
      return false;
    }
    return !!ConfigManager.getAPIKey('claudecode');
  }

  getServiceName(): AIService {
    return 'claudecode';
  }
}



/**
 * 智能 AI 服务管理器
 *
 * 负责管理多个 AI 服务，实现智能故障转移和负载均衡
 */
class SmartAIManager {
  private services: Map<AIService, IAIService> = new Map();
  private serviceOrder: AIService[] = [];
  private configInitialized: boolean = false;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    // 初始化所有AI服务
    this.services.set('gemini', new GeminiService());
    this.services.set('claudecode', new ClaudeCodeService());

    // 延迟设置服务优先级顺序，等待 ConfigManager 初始化
    // this.updateServiceOrder(); // 移到 ensureConfigured 中调用
  }

  /**
   * 确保配置已初始化
   */
  private ensureConfigInitialized(): void {
    if (!this.configInitialized) {
      this.updateServiceOrder();
      this.configInitialized = true;
    }
  }

  private updateServiceOrder(): void {
    // 检查 ConfigManager 是否已初始化
    if (!(ConfigManager as any).initialized) {
      // 如果未初始化，使用默认顺序
      this.serviceOrder = ['gemini', 'claudecode'];
      logger.debug('ConfigManager 未初始化，使用默认服务顺序', { serviceOrder: this.serviceOrder });
      return;
    }

    const primaryService = ConfigManager.getAIService();
    const allServices: AIService[] = ['gemini', 'claudecode'];

    // 将主要服务放在第一位，其他服务按配置状态排序
    this.serviceOrder = [primaryService];

    const otherServices = allServices
      .filter(service => service !== primaryService)
      .sort((a, b) => {
        const aConfigured = this.services.get(a)?.isConfigured() ? 1 : 0;
        const bConfigured = this.services.get(b)?.isConfigured() ? 1 : 0;
        return bConfigured - aConfigured; // 已配置的服务优先
      });

    this.serviceOrder.push(...otherServices);

    logger.debug('AI服务优先级顺序', { serviceOrder: this.serviceOrder });
  }

  /**
   * 智能调用AI服务
   *
   * @param primaryService 首选AI服务
   * @param prompt 提示词内容
   * @param additionalPrompt 附加提示词
   * @returns AI生成的内容
   */
  async intelligentCall(
    primaryService: AIService,
    prompt: string,
    additionalPrompt?: string
  ): Promise<{ result: string; usedService: AIService }> {
    // 确保配置已初始化
    this.ensureConfigInitialized();

    // 如果禁用自动切换，只使用指定服务
    if (!ConfigManager.isAutoSwitchEnabled()) {
      const service = this.services.get(primaryService);
      if (!service) {
        throw new Error(`不支持的AI服务: ${primaryService}`);
      }

      const result = await service.callAPI(prompt, additionalPrompt);
      return { result, usedService: primaryService };
    }

    // 获取服务尝试顺序
    const tryOrder = this.getTryOrder(primaryService);
    const maxRetries = ConfigManager.getMaxRetries();
    const errors: Array<{ service: AIService; error: string }> = [];

    logger.info('开始智能AI调用', {
      primaryService,
      tryOrder,
      autoSwitch: true
    });

    for (const serviceName of tryOrder) {
      const service = this.services.get(serviceName);
      if (!service) {
        continue;
      }

      // 检查服务是否已配置
      if (!service.isConfigured()) {
        logger.debug(`跳过未配置的服务: ${serviceName}`);
        continue;
      }

      // 尝试调用服务（带重试）
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.debug(`尝试调用 ${serviceName} (第${attempt}次)`);

          const result = await service.callAPI(prompt, additionalPrompt);

          logger.info(`AI调用成功`, {
            service: serviceName,
            attempt,
            resultLength: result.length
          });

          return { result, usedService: serviceName };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`${serviceName} 调用失败 (第${attempt}次)`, { error: errorMessage });

          errors.push({ service: serviceName, error: errorMessage });

          // 如果不是最后一次尝试，等待后重试
          if (attempt < maxRetries) {
            const delay = this.getRetryDelay(attempt);
            logger.debug(`等待 ${delay}ms 后重试`);
            await this.sleep(delay);
          }
        }
      }
    }

    // 所有服务都失败了
    const errorSummary = errors.map(e => `${e.service}: ${e.error}`).join('; ');
    logger.error('所有AI服务调用失败', new Error('所有AI服务调用失败'), { errors });

    throw new Error(`所有AI服务都不可用。错误详情: ${errorSummary}`);
  }

  /**
   * 获取服务尝试顺序
   */
  private getTryOrder(primaryService: AIService): AIService[] {
    const order = [primaryService];
    const others = this.serviceOrder.filter(s => s !== primaryService);
    return order.concat(others);
  }

  /**
   * 获取重试延迟时间
   */
  private getRetryDelay(attempt: number): number {
    // 指数退避策略：2^attempt * 1000ms
    return Math.min(Math.pow(2, attempt) * 1000, 10000);
  }

  /**
   * 休眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取所有服务状态
   */
  getServicesStatus(): Array<{
    service: AIService;
    configured: boolean;
    available: boolean;
  }> {
    // 确保配置已初始化
    this.ensureConfigInitialized();

    return Array.from(this.services.entries()).map(([name, service]) => ({
      service: name,
      configured: service.isConfigured(),
      available: service.isConfigured(), // 简化实现，认为已配置就是可用的
    }));
  }

  /**
   * 检查特定服务是否可用
   */
  isServiceAvailable(service: AIService): boolean {
    const serviceInstance = this.services.get(service);
    return serviceInstance ? serviceInstance.isConfigured() : false;
  }
}

/**
 * 独立 CodeRocket 服务类
 *
 * 提供完全独立的代码审查和AI服务管理功能，不依赖 coderocket-cli
 */
export class CodeRocketService {
  private aiManager: SmartAIManager;
  private initialized: boolean = false;

  constructor() {
    this.aiManager = new SmartAIManager();
  }

  /**
   * 初始化服务
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await ConfigManager.initialize();
      await PromptManager.preloadCommonPrompts();
      this.initialized = true;
      logger.info('CodeRocket 独立服务初始化完成');
    }
  }

  /**
   * 执行AI审查的通用方法
   */
  private async executeAIReview(
    aiService: AIService,
    promptName: string,
    additionalPrompt: string
  ): Promise<ReviewResult> {
    try {
      // 加载提示词
      const promptContent = await PromptManager.loadPrompt(promptName);

      // 获取语言配置
      const language = ConfigManager.getAILanguage();

      // 添加语言要求到提示词
      const languageInstruction = language === 'zh-CN'
        ? '\n\n**重要：请务必使用中文回复，所有审查结果、建议和评价都必须用中文表达。**'
        : '\n\n**Important: Please respond in English.**';

      const enhancedPrompt = promptContent + languageInstruction;

      // 调用AI服务
      const { result, usedService } = await this.aiManager.intelligentCall(
        aiService,
        enhancedPrompt,
        additionalPrompt
      );

      // 解析审查结果
      return this.parseReviewResult(result, usedService);
    } catch (error) {
      logger.error('AI审查执行失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'executeAIReview');
    }
  }


  /**
   * 解析审查结果
   */
  private parseReviewResult(
    output: string,
    aiService: AIService,
  ): ReviewResult {
    const lines = output.split('\n');
    let status: ReviewStatus = '🔍';
    let summary = '';
    let details = output;

    // 尝试从输出中提取状态
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (line.includes('✅') || lowerLine.includes('通过') || lowerLine.includes('优秀')) {
        status = '✅';
        break;
      } else if (line.includes('⚠️') || lowerLine.includes('警告') || lowerLine.includes('需改进')) {
        status = '⚠️';
        break;
      } else if (line.includes('❌') || lowerLine.includes('失败') || lowerLine.includes('有问题')) {
        status = '❌';
        break;
      } else if (line.includes('🔍') || lowerLine.includes('调查') || lowerLine.includes('需调查')) {
        status = '🔍';
        break;
      }
    }

    // 提取摘要（通常是第一段非空内容）
    const nonEmptyLines = lines.filter(line => line.trim());
    if (nonEmptyLines.length > 0) {
      // 寻找总体评价或摘要部分
      let summaryLine = nonEmptyLines[0];
      for (const line of nonEmptyLines) {
        if (line.includes('总体评价') || line.includes('审查摘要') || line.includes('摘要')) {
          const nextIndex = nonEmptyLines.indexOf(line) + 1;
          if (nextIndex < nonEmptyLines.length) {
            summaryLine = nonEmptyLines[nextIndex];
            break;
          }
        }
      }

      summary = summaryLine.substring(0, 200) + (summaryLine.length > 200 ? '...' : '');
    }

    return {
      status,
      summary: summary || '代码审查完成',
      details,
      ai_service_used: aiService,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 审查代码片段
   */
  async reviewCode(request: ReviewCodeRequest): Promise<ReviewResult> {
    await this.ensureInitialized();
    logger.info('开始代码审查', {
      language: request.language,
      codeLength: request.code.length,
      aiService: request.ai_service,
    });

    try {
      // 构建审查提示词
      const reviewPrompt = `请审查以下代码：

编程语言: ${request.language || '未指定'}
上下文信息: ${request.context || '无'}

代码内容:
\`\`\`${request.language || ''}
${request.code}
\`\`\`

请根据以下要求进行全面审查：
1. 功能完整性和正确性
2. 代码质量和可维护性
3. 性能优化建议
4. 安全性检查
5. 最佳实践遵循情况

${request.custom_prompt ? `\n附加要求：\n${request.custom_prompt}` : ''}

**重要：请务必使用中文回复，所有审查结果、建议和评价都必须用中文表达。**`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || ConfigManager.getAIService();
      const result = await this.executeAIReview(aiService, 'code-review-prompt', reviewPrompt);

      logger.info('代码审查完成', {
        status: result.status,
        aiService: result.ai_service_used,
      });

      return result;
    } catch (error) {
      logger.error('代码审查失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'reviewCode');
    }
  }

  /**
   * 根据语言获取文件扩展名
   */
  private getFileExtension(language?: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      shell: 'sh',
      bash: 'sh',
    };

    return extensions[language?.toLowerCase() || ''] || 'txt';
  }

  /**
   * 审查Git提交
   */
  async reviewCommit(request: ReviewCommitRequest): Promise<ReviewResult> {
    await this.ensureInitialized();
    logger.info('开始Git提交审查', {
      repositoryPath: request.repository_path,
      commitHash: request.commit_hash,
      aiService: request.ai_service,
    });

    try {
      const repoPath = request.repository_path || process.cwd();

      // 获取提交信息
      const commitHash = request.commit_hash || 'HEAD';
      const { stdout: commitInfo } = await execAsync(`git --no-pager show ${commitHash}`, {
        cwd: repoPath,
        timeout: 30000,
      });

      if (!commitInfo.trim()) {
        throw new Error(`无法获取提交信息: ${commitHash}`);
      }

      // 构建审查提示词
      const reviewPrompt = `请对以下Git提交进行专业的代码审查：

仓库路径: ${repoPath}
提交哈希: ${commitHash}

提交详情:
${commitInfo}

请根据以下要求进行全面审查：
1. 分析提交的目标和完成度
2. 检查代码质量和规范性
3. 评估安全性和性能影响
4. 检查是否遗漏相关文件修改
5. 提供具体的改进建议

${request.custom_prompt ? `\n附加要求：\n${request.custom_prompt}` : ''}

**重要：请务必使用中文回复，所有审查结果、建议和评价都必须用中文表达。**`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || ConfigManager.getAIService();
      const result = await this.executeAIReview(aiService, 'git-commit-review-prompt', reviewPrompt);

      logger.info('Git提交审查完成', {
        status: result.status,
        aiService: result.ai_service_used,
      });

      return result;
    } catch (error) {
      logger.error('Git提交审查失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'reviewCommit');
    }
  }

  /**
   * 审查文件列表
   */
  async reviewFiles(request: ReviewFilesRequest): Promise<ReviewResult> {
    await this.ensureInitialized();
    logger.info('开始文件审查', {
      repositoryPath: request.repository_path,
      filesCount: request.files.length,
      aiService: request.ai_service,
    });

    try {
      const repoPath = request.repository_path || process.cwd();

      // 读取文件内容
      const fileContents: string[] = [];
      for (const filePath of request.files) {
        try {
          const fullPath = resolve(repoPath, filePath);
          const content = await readFile(fullPath, 'utf-8');

          // 限制单个文件内容长度，避免提示词过长
          const truncatedContent = content.length > 5000
            ? content.substring(0, 5000) + '\n... (内容已截断)'
            : content;

          fileContents.push(`## 文件: ${filePath}\n\`\`\`\n${truncatedContent}\n\`\`\``);
        } catch (error) {
          fileContents.push(`## 文件: ${filePath}\n**错误**: 无法读取文件 - ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 构建审查提示词
      const reviewPrompt = `请审查以下文件：

仓库路径: ${repoPath}
文件数量: ${request.files.length}
文件列表: ${request.files.join(', ')}

${fileContents.join('\n\n')}

请根据以下要求进行全面审查：
1. 分析文件间的关联性和一致性
2. 检查代码质量和规范性
3. 评估架构设计的合理性
4. 识别潜在的问题和改进点
5. 提供具体的优化建议

${request.custom_prompt ? `\n附加要求：\n${request.custom_prompt}` : ''}`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || ConfigManager.getAIService();
      const result = await this.executeAIReview(aiService, 'code-review-prompt', reviewPrompt);

      logger.info('文件审查完成', {
        status: result.status,
        aiService: result.ai_service_used,
      });

      return result;
    } catch (error) {
      logger.error('文件审查失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'reviewFiles');
    }
  }

  /**
   * 配置AI服务
   */
  async configureAIService(
    request: ConfigureAIServiceRequest,
  ): Promise<SuccessResponse> {
    await this.ensureInitialized();
    logger.info('开始配置AI服务', {
      service: request.service,
      scope: request.scope,
      hasApiKey: !!request.api_key,
    });

    try {
      // 如果提供了API密钥，设置环境变量并保存到配置文件
      if (request.api_key) {
        const envVarName = ConfigManager.getAPIKeyEnvVar(request.service);
        process.env[envVarName] = request.api_key;

        // 保存到配置文件
        await this.saveAPIKeyToConfig(
          request.service,
          request.api_key,
          request.scope,
        );
      }

      // 设置主要AI服务
      if (request.service) {
        process.env.AI_SERVICE = request.service;
        await this.saveConfigToFile('AI_SERVICE', request.service, request.scope);
      }

      // 设置其他配置项
      if (request.language) {
        process.env.AI_LANGUAGE = request.language;
        await this.saveConfigToFile('AI_LANGUAGE', request.language, request.scope);
      }

      if (request.timeout) {
        process.env.AI_TIMEOUT = request.timeout.toString();
        await this.saveConfigToFile('AI_TIMEOUT', request.timeout.toString(), request.scope);
      }

      if (request.max_retries) {
        process.env.AI_MAX_RETRIES = request.max_retries.toString();
        await this.saveConfigToFile('AI_MAX_RETRIES', request.max_retries.toString(), request.scope);
      }

      logger.info('AI服务配置完成', {
        service: request.service,
        scope: request.scope,
      });

      return {
        success: true,
        message: `AI服务 ${request.service} 配置成功`,
        data: {
          service: request.service,
          scope: request.scope,
          configured_options: {
            api_key: !!request.api_key,
            timeout: request.timeout,
            max_retries: request.max_retries,
          },
        },
      };
    } catch (error) {
      logger.error('AI服务配置失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'configureAIService');
    }
  }


  /**
   * 保存配置项到文件
   */
  private async saveConfigToFile(
    key: string,
    value: string,
    scope: string,
  ): Promise<void> {
    const { file: configFile } = ConfigManager.getConfigPath(scope);

    // 确保配置目录存在
    await mkdir(dirname(configFile), { recursive: true });

    try {
      // 读取现有配置
      let existingConfig = '';
      try {
        existingConfig = await readFile(configFile, 'utf-8');
      } catch {
        // 文件不存在，创建新的
      }

      // 更新或添加配置行
      const lines = existingConfig.split('\n');
      const existingLineIndex = lines.findIndex(line =>
        line.trim().startsWith(`${key}=`)
      );

      const configLine = `${key}=${value}`;
      if (existingLineIndex >= 0) {
        lines[existingLineIndex] = configLine;
      } else {
        lines.push(configLine);
      }

      // 写入配置文件
      const newConfig = lines.filter(line => line.trim()).join('\n') + '\n';
      await writeFile(configFile, newConfig, 'utf-8');

      logger.debug('配置已保存', { key, configFile, scope });
    } catch (error) {
      logger.error('保存配置失败', error instanceof Error ? error : new Error(String(error)), { key, configFile });
      throw error;
    }
  }

  /**
   * 保存API密钥到配置文件
   *
   * ⚠️ 安全警告：API密钥将以明文形式存储在配置文件中。
   * 请确保配置文件的访问权限受到适当限制。
   * 建议使用环境变量或更安全的密钥管理方案。
   */
  private async saveAPIKeyToConfig(
    service: AIService,
    apiKey: string,
    scope: string,
  ): Promise<void> {
    // 记录安全警告
    logger.warn('API密钥将以明文形式存储，请确保文件访问权限安全', {
      service,
      scope,
    });

    const envVarName = ConfigManager.getAPIKeyEnvVar(service);
    await this.saveConfigToFile(envVarName, apiKey, scope);
  }

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(): Promise<ServiceStatusResponse> {
    await this.ensureInitialized();
    logger.info('获取AI服务状态');

    try {
      // 获取当前配置的AI服务
      const current = ConfigManager.getAIService();

      // 获取所有服务状态
      const services = this.aiManager.getServicesStatus();

      return {
        current_service: current,
        services,
        auto_switch_enabled: ConfigManager.isAutoSwitchEnabled(),
        language: ConfigManager.getAILanguage(),
        global_config_path: join(homedir(), '.coderocket', 'env'),
        project_config_path: join(process.cwd(), '.env'),
        timeout: ConfigManager.getTimeout(),
        max_retries: ConfigManager.getMaxRetries(),
      };
    } catch (error) {
      logger.error('获取AI服务状态失败', error instanceof Error ? error : new Error(String(error)));
      throw errorHandler.handleError(error, 'getAIServiceStatus');
    }
  }
}
