import { execSync } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import {
  ReviewCodeRequest,
  ReviewChangesRequest,
  ReviewCommitRequest,
  ReviewFilesRequest,
  ConfigureAIServiceRequest,
  GetAIServiceStatusRequest,
  ReviewCodeResponse,
  ReviewChangesResponse,
  ReviewCommitResponse,
  ReviewFilesResponse,
  ConfigureAIServiceResponse,
  GetAIServiceStatusResponse,
  AIService,
} from '../types.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { PromptManager } from '../prompts/PromptManager.js';
import { SmartAIManager } from '../ai/SmartAIManager.js';
import { GitError, FileError, logger } from '../logger.js';

/**
 * CodeRocket 核心服务类
 *
 * 提供所有MCP工具的实现：
 * - 代码片段审查
 * - Git变更审查
 * - Git提交审查
 * - 文件批量审查
 * - AI服务配置管理
 * - 服务状态监控
 */
export class CodeRocketService {
  private aiManager: SmartAIManager;

  constructor() {
    // 确保配置和提示词系统已初始化
    this.ensureInitialized();
    this.aiManager = new SmartAIManager();
  }

  /**
   * 确保所有依赖系统已初始化
   */
  private ensureInitialized(): void {
    if (!ConfigManager.isInitialized()) {
      throw new Error('ConfigManager 未初始化，请先调用 ConfigManager.initialize()');
    }
  }

  /**
   * 审查代码片段
   */
  async reviewCode(request: ReviewCodeRequest): Promise<ReviewCodeResponse> {
    logger.info('开始代码片段审查', {
      codeLength: request.code.length,
      language: request.language,
      hasContext: !!request.context,
    });

    try {
      // 构建审查提示词
      const prompt = this.buildCodeReviewPrompt(request);

      // 确定使用的AI服务
      const aiService = (request.ai_service as AIService) || ConfigManager.getAIService();

      // 调用AI服务进行审查
      const { result, usedService } = await this.aiManager.intelligentCall(
        aiService,
        prompt
      );

      const response: ReviewCodeResponse = {
        status: '✅',
        summary: '代码审查完成',
        review: result,
        ai_service_used: usedService,
        timestamp: new Date().toISOString(),
      };

      logger.info('代码片段审查完成', {
        aiService: usedService,
        reviewLength: result.length,
      });

      return response;
    } catch (error) {
      logger.error('代码片段审查失败', error instanceof Error ? error : new Error(String(error)));
      return {
        status: '❌',
        summary: '代码审查失败',
        review: `审查过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 审查Git变更
   */
  async reviewChanges(request: ReviewChangesRequest): Promise<ReviewChangesResponse> {
    logger.info('开始Git变更审查', {
      repositoryPath: request.repository_path,
      includeStaged: request.include_staged,
      includeUnstaged: request.include_unstaged,
    });

    try {
      const repoPath = request.repository_path || process.cwd();
      
      // 安全检查：验证路径
      if (!this.isValidPath(repoPath)) {
        throw new GitError('无效的仓库路径');
      }

      // 获取Git变更
      const changes = await this.getGitChanges(repoPath, request);

      if (!changes.trim()) {
        return {
          status: '📝',
          summary: '没有发现变更',
          review: '当前没有需要审查的代码变更。',
          ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
          timestamp: new Date().toISOString(),
        };
      }

      // 构建审查提示词
      const prompt = this.buildChangesReviewPrompt(changes, request);

      // 确定使用的AI服务
      const aiService = (request.ai_service as AIService) || ConfigManager.getAIService();

      // 调用AI服务进行审查
      const { result, usedService } = await this.aiManager.intelligentCall(
        aiService,
        prompt
      );

      const response: ReviewChangesResponse = {
        status: '✅',
        summary: 'Git变更审查完成',
        review: result,
        ai_service_used: usedService,
        timestamp: new Date().toISOString(),
      };

      logger.info('Git变更审查完成', {
        aiService: usedService,
        changesLength: changes.length,
      });

      return response;
    } catch (error) {
      logger.error('Git变更审查失败', error instanceof Error ? error : new Error(String(error)));
      return {
        status: '❌',
        summary: 'Git变更审查失败',
        review: `审查过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 路径安全验证
   */
  private isValidPath(path: string): boolean {
    // 基本的路径安全检查
    if (!path || typeof path !== 'string') return false;
    if (path.includes('..')) return false; // 防止路径遍历
    if (path.includes('\0')) return false; // 防止空字节注入
    return true;
  }

  /**
   * 检查是否为Git仓库
   */
  async checkGitRepository(repositoryPath: string = process.cwd()): Promise<boolean> {
    try {
      const result = execSync('git rev-parse --git-dir', {
        cwd: repositoryPath,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return result.trim() !== '';
    } catch (error) {
      return false;
    }
  }

  /**
   * 安全地执行Git命令
   */
  private async executeGitCommand(command: string, repositoryPath: string): Promise<string> {
    try {
      const result = execSync(command, {
        cwd: repositoryPath,
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return result;
    } catch (error) {
      throw new GitError(`Git命令执行失败: ${command} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析Git状态输出字符串（用于测试）
   */
  parseGitStatus(statusOutput: string): Array<{
    path: string;
    status: string;
    statusDescription: string;
  }> {
    const lines = statusOutput.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const status = line.substring(0, 2);
      const path = line.substring(3);
      return {
        path,
        status,
        statusDescription: this.getGitStatusDescription(status)
      };
    });
  }

  /**
   * 获取Git状态描述
   */
  getGitStatusDescription(status: string): string {
    const statusMap: Record<string, string> = {
      'M ': '已修改（已暂存）',
      ' M': '已修改（未暂存）',
      'A ': '新增文件（已暂存）',
      ' A': '新增文件（未暂存）',
      'D ': '已删除（已暂存）',
      ' D': '已删除（未暂存）',
      'R ': '重命名（已暂存）',
      ' R': '重命名（未暂存）',
      'C ': '复制（已暂存）',
      ' C': '复制（未暂存）',
      'U ': '未合并（已暂存）',
      ' U': '未合并（未暂存）',
      '??': '未跟踪文件',
      '!!': '已忽略文件'
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 解析Git仓库状态
   */
  async parseGitRepositoryStatus(repositoryPath: string = process.cwd()): Promise<{
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }> {
    try {
      const result = await this.executeGitCommand('git status --porcelain', repositoryPath);
      const lines = result.split('\n').filter(line => line.trim());

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      for (const line of lines) {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(file);
        }
        if (status[1] !== ' ' && status[1] !== '?') {
          unstaged.push(file);
        }
        if (status === '??') {
          untracked.push(file);
        }
      }

      return { staged, unstaged, untracked };
    } catch (error) {
      throw new GitError(`解析Git状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取Git变更（安全版本）
   */
  private async getGitChanges(repoPath: string, request: ReviewChangesRequest): Promise<string> {
    const commands: string[] = [];
    
    // 构建安全的Git命令
    if (request.include_staged !== false) {
      commands.push('git diff --cached');
    }
    if (request.include_unstaged !== false) {
      commands.push('git diff');
    }

    let allChanges = '';
    for (const command of commands) {
      try {
        const result = execSync(command, {
          cwd: repoPath,
          encoding: 'utf-8',
          timeout: 30000, // 30秒超时
          maxBuffer: 10 * 1024 * 1024, // 10MB 缓冲区限制
        });
        allChanges += result + '\n';
      } catch (error) {
        logger.warn(`Git命令执行失败: ${command}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return allChanges;
  }

  /**
   * 构建代码审查提示词
   */
  private buildCodeReviewPrompt(request: ReviewCodeRequest): string {
    const variables = {
      code: request.code,
      language: request.language || '未指定',
      context: request.context || '无额外上下文',
    };

    return PromptManager.buildPrompt(
      'review_code',
      request.code,
      request.custom_prompt,
      ConfigManager.getAILanguage()
    );
  }

  /**
   * 构建变更审查提示词
   */
  private buildChangesReviewPrompt(changes: string | any, request: ReviewChangesRequest): string {
    // 如果传入的是对象（用于测试），构建详细的提示词
    if (typeof changes === 'object' && changes.files) {
      const fileCount = changes.files.length;
      const fileList = changes.files.map((f: any) => `- ${f.path} (${f.statusDescription})`).join('\n');

      let prompt = `请审查以下Git变更：

变更文件数量: ${fileCount}

变更文件列表：
${fileList}

变更内容：
\`\`\`diff
${changes.diff}
\`\`\`

Git状态输出：
\`\`\`
${changes.statusOutput}
\`\`\`
`;

      if (request.custom_prompt) {
        prompt += `\n特殊要求：${request.custom_prompt}\n`;
      }

      prompt += '\n请务必使用中文回复。';

      return prompt;
    }

    // 原有的字符串处理逻辑
    return PromptManager.buildPrompt(
      'review_changes',
      changes,
      request.custom_prompt,
      ConfigManager.getAILanguage()
    );
  }

  /**
   * 审查Git提交
   */
  async reviewCommit(request: ReviewCommitRequest): Promise<ReviewCommitResponse> {
    logger.info('开始Git提交审查', {
      repositoryPath: request.repository_path,
      commitHash: request.commit_hash,
    });

    try {
      const repoPath = request.repository_path || process.cwd();

      // 安全检查：验证路径和提交哈希
      if (!this.isValidPath(repoPath)) {
        throw new GitError('无效的仓库路径');
      }
      if (request.commit_hash && !this.isValidCommitHash(request.commit_hash)) {
        throw new GitError('无效的提交哈希');
      }

      // 获取提交信息
      const commitInfo = await this.getCommitInfo(repoPath, request.commit_hash);

      if (!commitInfo.trim()) {
        return {
          status: '📝',
          summary: '没有找到提交信息',
          review: '无法获取指定的提交信息。',
          ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
          timestamp: new Date().toISOString(),
        };
      }

      // 构建审查提示词
      const prompt = this.buildCommitReviewPrompt(commitInfo, request);

      // 确定使用的AI服务
      const aiService = (request.ai_service as AIService) || ConfigManager.getAIService();

      // 调用AI服务进行审查
      const { result, usedService } = await this.aiManager.intelligentCall(
        aiService,
        prompt
      );

      const response: ReviewCommitResponse = {
        status: '✅',
        summary: 'Git提交审查完成',
        review: result,
        ai_service_used: usedService,
        timestamp: new Date().toISOString(),
      };

      logger.info('Git提交审查完成', {
        aiService: usedService,
        commitHash: request.commit_hash,
      });

      return response;
    } catch (error) {
      logger.error('Git提交审查失败', error instanceof Error ? error : new Error(String(error)));
      return {
        status: '❌',
        summary: 'Git提交审查失败',
        review: `审查过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 验证提交哈希格式
   */
  private isValidCommitHash(hash: string): boolean {
    // Git提交哈希应该是40个十六进制字符，或者是短哈希（7-40个字符）
    const hashRegex = /^[a-f0-9]{7,40}$/i;
    return hashRegex.test(hash);
  }

  /**
   * 获取提交信息（安全版本）
   */
  private async getCommitInfo(repoPath: string, commitHash?: string): Promise<string> {
    try {
      const hash = commitHash || 'HEAD';
      const command = `git show ${hash} --pretty=fuller --stat`;

      const result = execSync(command, {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 30000, // 30秒超时
        maxBuffer: 10 * 1024 * 1024, // 10MB 缓冲区限制
      });

      return result;
    } catch (error) {
      throw new GitError(`获取提交信息失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建提交审查提示词
   */
  private buildCommitReviewPrompt(commitInfo: string, request: ReviewCommitRequest): string {
    return PromptManager.buildPrompt(
      'review_commit',
      commitInfo,
      request.custom_prompt,
      ConfigManager.getAILanguage()
    );
  }

  /**
   * 审查多个文件
   */
  async reviewFiles(request: ReviewFilesRequest): Promise<ReviewFilesResponse> {
    logger.info('开始文件批量审查', {
      fileCount: request.files.length,
      repositoryPath: request.repository_path,
    });

    try {
      const repoPath = request.repository_path || process.cwd();

      // 安全检查：验证路径
      if (!this.isValidPath(repoPath)) {
        throw new FileError('无效的仓库路径');
      }

      // 读取并处理文件内容
      const fileContents = await this.readMultipleFiles(request.files, repoPath);

      if (fileContents.length === 0) {
        return {
          status: '📝',
          summary: '没有找到可读取的文件',
          review: '指定的文件都无法读取或不存在。',
          ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
          timestamp: new Date().toISOString(),
        };
      }

      // 构建审查内容
      const reviewContent = this.buildFileReviewContent(fileContents);

      // 构建审查提示词
      const prompt = this.buildFilesReviewPrompt(reviewContent, request);

      // 确定使用的AI服务
      const aiService = (request.ai_service as AIService) || ConfigManager.getAIService();

      // 调用AI服务进行审查
      const { result, usedService } = await this.aiManager.intelligentCall(
        aiService,
        prompt
      );

      const response: ReviewFilesResponse = {
        status: '✅',
        summary: '文件批量审查完成',
        review: result,
        ai_service_used: usedService,
        timestamp: new Date().toISOString(),
      };

      logger.info('文件批量审查完成', {
        aiService: usedService,
        fileCount: fileContents.length,
      });

      return response;
    } catch (error) {
      logger.error('文件批量审查失败', error instanceof Error ? error : new Error(String(error)));
      return {
        status: '❌',
        summary: '文件批量审查失败',
        review: `审查过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        ai_service_used: request.ai_service as AIService || ConfigManager.getAIService(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 读取多个文件内容（安全版本）
   */
  private async readMultipleFiles(
    files: string[],
    basePath: string
  ): Promise<Array<{ path: string; content: string; error?: string }>> {
    const results: Array<{ path: string; content: string; error?: string }> = [];
    const maxFileSize = 1024 * 1024; // 1MB 限制
    const charLimit = parseInt(ConfigManager.get('FILE_CONTENT_CHAR_LIMIT', '5000'), 10);

    for (const file of files) {
      try {
        // 安全检查：验证文件路径
        if (!this.isValidPath(file)) {
          results.push({
            path: file,
            content: '',
            error: '无效的文件路径',
          });
          continue;
        }

        const filePath = join(basePath, file);

        // 检查文件是否存在
        if (!existsSync(filePath)) {
          results.push({
            path: file,
            content: '',
            error: '文件不存在',
          });
          continue;
        }

        // 读取文件内容
        let content = await readFile(filePath, 'utf-8');

        // 内容截断处理
        if (content.length > charLimit) {
          content = content.substring(0, charLimit) + '\n\n[... 内容已截断 ...]';
        }

        results.push({
          path: file,
          content,
        });

      } catch (error) {
        results.push({
          path: file,
          content: '',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results.filter(result => result.content || result.error);
  }

  /**
   * 构建文件审查内容
   */
  private buildFileReviewContent(
    fileContents: Array<{ path: string; content: string; error?: string }>
  ): string {
    let content = '文件审查内容：\n\n';

    for (const file of fileContents) {
      content += `## 文件: ${file.path}\n\n`;

      if (file.error) {
        content += `错误: ${file.error}\n\n`;
      } else {
        content += `\`\`\`\n${file.content}\n\`\`\`\n\n`;
      }
    }

    return content;
  }

  /**
   * 构建文件审查提示词
   */
  private buildFilesReviewPrompt(content: string, request: ReviewFilesRequest): string {
    return PromptManager.buildPrompt(
      'review_files',
      content,
      request.custom_prompt,
      ConfigManager.getAILanguage()
    );
  }

  /**
   * 配置AI服务
   */
  async configureAIService(request: ConfigureAIServiceRequest): Promise<ConfigureAIServiceResponse> {
    logger.info('开始配置AI服务', {
      service: request.service,
      scope: request.scope,
      hasApiKey: !!request.api_key,
    });

    try {
      const service = request.service as AIService;
      const scope = request.scope || 'project';

      // 验证服务类型
      if (!['gemini', 'claudecode'].includes(service)) {
        throw new Error(`不支持的AI服务: ${service}`);
      }

      // 获取配置路径
      const { dir: configDir, file: configFile } = ConfigManager.getConfigPath(scope);

      // 确保配置目录存在
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }

      // 读取现有配置
      let existingConfig: Record<string, string> = {};
      if (existsSync(configFile)) {
        try {
          const content = await readFile(configFile, 'utf-8');
          existingConfig = ConfigManager.parseEnvContent(content);
        } catch (error) {
          logger.warn('读取现有配置失败，将创建新配置', { error: error instanceof Error ? error.message : String(error) });
        }
      }

      // 更新配置
      if (request.api_key) {
        const envVar = ConfigManager.getAPIKeyEnvVar(service);
        existingConfig[envVar] = request.api_key;
      }

      if (request.timeout) {
        existingConfig['AI_TIMEOUT'] = request.timeout.toString();
      }

      if (request.max_retries) {
        existingConfig['AI_MAX_RETRIES'] = request.max_retries.toString();
      }

      // 语言配置已移除，使用默认配置

      // 写入配置文件
      const configContent = Object.entries(existingConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      await writeFile(configFile, configContent, 'utf-8');

      // 重新初始化AI管理器
      this.aiManager.reinitialize();

      const response: ConfigureAIServiceResponse = {
        success: true,
        message: `AI服务 ${service} 配置成功`,
        config_path: configFile,
        restart_required: false,
      };

      logger.info('AI服务配置完成', {
        service,
        configPath: configFile,
      });

      return response;
    } catch (error) {
      logger.error('AI服务配置失败', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        message: `配置失败: ${error instanceof Error ? error.message : String(error)}`,
        config_path: '',
        restart_required: false,
      };
    }
  }

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(request?: GetAIServiceStatusRequest): Promise<GetAIServiceStatusResponse> {
    logger.info('开始获取AI服务状态');

    try {
      // 刷新服务状态
      await this.aiManager.refreshServiceStatus();

      // 获取服务状态
      const serviceStatus = this.aiManager.getServiceStatus();
      const availableServices = this.aiManager.getAvailableServices();

      // 构建详细状态信息
      const services = Object.entries(serviceStatus).map(([service, available]) => {
        const apiKey = ConfigManager.getAPIKey(service as AIService);
        return {
          service: service as AIService,
          available,
          configured: !!apiKey,
        };
      });

      const response: GetAIServiceStatusResponse = {
        services,
        current_service: ConfigManager.getAIService(),
        auto_switch_enabled: ConfigManager.isAutoSwitchEnabled(),
      };

      logger.info('AI服务状态获取完成', {
        availableCount: availableServices.length,
        totalCount: services.length,
      });

      return response;
    } catch (error) {
      logger.error('获取AI服务状态失败', error instanceof Error ? error : new Error(String(error)));
      return {
        services: [],
        current_service: 'gemini',
        auto_switch_enabled: false,
      };
    }
  }
}
