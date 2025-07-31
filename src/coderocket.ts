import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { tmpdir } from 'os';
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
 * CodeRocket服务类
 * 
 * 负责与coderocket-cli集成，提供代码审查和AI服务管理功能
 */
export class CodeRocketService {
  private coderocketCliPath: string;

  constructor() {
    // 尝试找到coderocket-cli的路径
    this.coderocketCliPath = this.findCoderocketCliPath();
    logger.info('CodeRocket服务初始化', {
      coderocketCliPath: this.coderocketCliPath
    });
  }

  /**
   * 查找coderocket-cli的安装路径
   */
  private findCoderocketCliPath(): string {
    // 优先级：
    // 1. 相对路径（开发环境）
    // 2. 全局安装路径
    // 3. 用户主目录安装
    const possiblePaths = [
      resolve(process.cwd(), '../coderocket-cli'),
      resolve(process.cwd(), '../../coderocket-cli'),
      resolve(process.env.HOME || '~', '.coderocket'),
      resolve(process.env.HOME || '~', '.codereview-cli'), // 向后兼容
      '/usr/local/share/coderocket-cli',
    ];

    for (const path of possiblePaths) {
      try {
        // 检查关键文件是否存在
        const libPath = join(path, 'lib', 'ai-service-manager.sh');
        await access(libPath, fs.constants.F_OK);
        return path;
      } catch {
        continue;
      }
    }

    // 如果都找不到，使用默认路径（可能需要用户手动配置）
    return resolve(process.cwd(), '../coderocket-cli');
  }

  /**
   * 执行shell命令并返回结果
   */
  private async executeShellCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
    logger.debug('执行Shell命令', { command, cwd: cwd || this.coderocketCliPath });

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || this.coderocketCliPath,
        env: {
          ...process.env,
          PATH: `${this.coderocketCliPath}/bin:${process.env.PATH}`,
        },
        timeout: 300000, // 5分钟超时
      });

      logger.debug('Shell命令执行成功', {
        command,
        stdoutLength: stdout.length,
        stderrLength: stderr.length
      });

      return { stdout, stderr };
    } catch (error: any) {
      logger.error('Shell命令执行失败', error, { command, cwd });
      throw errorHandler.handleError(error, 'executeShellCommand');
    }
  }

  /**
   * 调用AI服务管理器脚本
   */
  private async callAIServiceManager(action: string, ...args: string[]): Promise<string> {
    const scriptPath = join(this.coderocketCliPath, 'lib', 'ai-service-manager.sh');
    const command = `bash "${scriptPath}" ${action} ${args.join(' ')}`;
    
    const { stdout, stderr } = await this.executeShellCommand(command);
    
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    
    return stdout.trim();
  }

  /**
   * 创建临时提示词文件
   */
  private async createTempPromptFile(customPrompt?: string): Promise<string> {
    const tempDir = tmpdir();
    const tempFile = join(tempDir, `coderocket-prompt-${Date.now()}.md`);
    
    let promptContent = '';
    
    if (customPrompt) {
      promptContent = customPrompt;
    } else {
      // 使用默认提示词
      const defaultPromptPath = join(this.coderocketCliPath, 'prompts', 'git-commit-review-prompt.md');
      try {
        promptContent = await readFile(defaultPromptPath, 'utf-8');
      } catch {
        // 如果找不到默认提示词，使用内置的基础提示词
        promptContent = this.getDefaultPrompt();
      }
    }
    
    await writeFile(tempFile, promptContent, 'utf-8');
    return tempFile;
  }

  /**
   * 获取内置的默认提示词
   */
  private getDefaultPrompt(): string {
    return `# 代码审查提示词

你是一个专业的代码审查专家。请对提供的代码进行全面审查，包括：

## 审查维度
1. **功能完整性**：代码是否正确实现了预期功能
2. **代码质量**：代码结构、可读性、维护性
3. **性能优化**：是否存在性能问题或优化空间
4. **安全性**：是否存在安全漏洞或风险
5. **最佳实践**：是否遵循编程最佳实践和规范

## 输出格式
请按以下格式输出审查结果：

### 审查状态
- ✅ 通过：功能完全实现，代码质量良好
- ⚠️ 警告：功能基本实现，但存在质量问题
- ❌ 失败：功能未实现或存在严重问题
- 🔍 调查：需要进一步调查

### 审查摘要
简要描述代码的整体质量和主要发现。

### 详细分析
提供具体的问题分析和改进建议。

请开始审查。`;
  }

  /**
   * 解析审查结果
   */
  private parseReviewResult(output: string, aiService: AIService): ReviewResult {
    const lines = output.split('\n');
    let status: ReviewStatus = '🔍';
    let summary = '';
    let details = output;

    // 尝试从输出中提取状态
    for (const line of lines) {
      if (line.includes('✅') || line.includes('通过')) {
        status = '✅';
        break;
      } else if (line.includes('⚠️') || line.includes('警告')) {
        status = '⚠️';
        break;
      } else if (line.includes('❌') || line.includes('失败')) {
        status = '❌';
        break;
      } else if (line.includes('🔍') || line.includes('调查')) {
        status = '🔍';
        break;
      }
    }

    // 提取摘要（通常是第一段非空内容）
    const nonEmptyLines = lines.filter(line => line.trim());
    if (nonEmptyLines.length > 0) {
      summary = nonEmptyLines[0].substring(0, 200) + (nonEmptyLines[0].length > 200 ? '...' : '');
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
    logger.info('开始代码审查', {
      language: request.language,
      codeLength: request.code.length,
      aiService: request.ai_service
    });

    try {
      // 创建临时文件存储代码
      const tempDir = tmpdir();
      const tempCodeFile = join(tempDir, `code-${Date.now()}.${this.getFileExtension(request.language)}`);
      await writeFile(tempCodeFile, request.code, 'utf-8');

      // 创建提示词文件
      const promptFile = await this.createTempPromptFile(request.custom_prompt);

      // 构建审查提示词
      const reviewPrompt = `请审查以下代码：

文件路径: ${tempCodeFile}
编程语言: ${request.language || '未指定'}
上下文信息: ${request.context || '无'}

代码内容:
\`\`\`${request.language || ''}
${request.code}
\`\`\`

请根据提示词文件中的指导进行全面审查。`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || 'gemini';
      const scriptPath = join(this.coderocketCliPath, 'lib', 'ai-service-manager.sh');

      // 使用intelligent_ai_review函数
      const command = `source "${scriptPath}" && intelligent_ai_review "${aiService}" "${promptFile}" "${reviewPrompt}"`;
      const { stdout } = await this.executeShellCommand(command);

      const result = this.parseReviewResult(stdout, aiService);
      logger.info('代码审查完成', { status: result.status, aiService: result.ai_service_used });

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
    try {
      const repoPath = request.repository_path || process.cwd();
      const promptFile = await this.createTempPromptFile(request.custom_prompt);

      // 构建审查提示词
      const commitInfo = request.commit_hash ? `特定提交: ${request.commit_hash}` : '最新提交';
      const reviewPrompt = `请对Git仓库中的${commitInfo}进行代码审查：

仓库路径: ${repoPath}
${request.commit_hash ? `提交哈希: ${request.commit_hash}` : ''}

请使用 git show ${request.commit_hash || 'HEAD'} 命令获取提交详情，然后根据提示词文件中的指导进行全面审查。`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || 'gemini';
      const scriptPath = join(this.coderocketCliPath, 'lib', 'ai-service-manager.sh');
      
      const command = `cd "${repoPath}" && source "${scriptPath}" && intelligent_ai_review "${aiService}" "${promptFile}" "${reviewPrompt}"`;
      const { stdout } = await this.executeShellCommand(command, repoPath);

      return this.parseReviewResult(stdout, aiService);
    } catch (error) {
      throw new Error(`Git提交审查失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 审查文件列表
   */
  async reviewFiles(request: ReviewFilesRequest): Promise<ReviewResult> {
    try {
      const repoPath = request.repository_path || process.cwd();
      const promptFile = await this.createTempPromptFile(request.custom_prompt);

      // 读取文件内容
      const fileContents: string[] = [];
      for (const filePath of request.files) {
        try {
          const fullPath = resolve(repoPath, filePath);
          const content = await readFile(fullPath, 'utf-8');
          fileContents.push(`文件: ${filePath}\n\`\`\`\n${content}\n\`\`\``);
        } catch (error) {
          fileContents.push(`文件: ${filePath}\n错误: 无法读取文件 - ${error}`);
        }
      }

      // 构建审查提示词
      const reviewPrompt = `请审查以下文件：

仓库路径: ${repoPath}
文件列表: ${request.files.join(', ')}

文件内容:
${fileContents.join('\n\n')}

请根据提示词文件中的指导进行全面审查。`;

      // 调用AI服务进行审查
      const aiService = request.ai_service || 'gemini';
      const scriptPath = join(this.coderocketCliPath, 'lib', 'ai-service-manager.sh');

      const command = `source "${scriptPath}" && intelligent_ai_review "${aiService}" "${promptFile}" "${reviewPrompt}"`;
      const { stdout } = await this.executeShellCommand(command, repoPath);

      return this.parseReviewResult(stdout, aiService);
    } catch (error) {
      throw new Error(`文件审查失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 配置AI服务
   */
  async configureAIService(request: ConfigureAIServiceRequest): Promise<SuccessResponse> {
    try {
      // 设置AI服务
      await this.callAIServiceManager('set', request.service, request.scope);

      // 如果提供了API密钥，设置环境变量
      if (request.api_key) {
        const envVarName = this.getAPIKeyEnvVar(request.service);
        process.env[envVarName] = request.api_key;

        // 保存到配置文件
        await this.saveAPIKeyToConfig(request.service, request.api_key, request.scope);
      }

      // 设置其他配置项
      if (request.timeout) {
        process.env.AI_TIMEOUT = request.timeout.toString();
      }

      if (request.max_retries) {
        process.env.AI_MAX_RETRIES = request.max_retries.toString();
      }

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
      throw new Error(`AI服务配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取API密钥环境变量名
   */
  private getAPIKeyEnvVar(service: AIService): string {
    const envVars: Record<AIService, string> = {
      gemini: 'GEMINI_API_KEY',
      opencode: 'OPENCODE_API_KEY',
      claudecode: 'CLAUDECODE_API_KEY',
    };
    return envVars[service];
  }

  /**
   * 保存API密钥到配置文件
   */
  private async saveAPIKeyToConfig(service: AIService, apiKey: string, scope: string): Promise<void> {
    const configDir = scope === 'global'
      ? join(process.env.HOME || '~', '.coderocket')
      : process.cwd();

    const configFile = scope === 'global'
      ? join(configDir, 'env')
      : join(configDir, '.env');

    // 确保配置目录存在
    await mkdir(dirname(configFile), { recursive: true });

    const envVarName = this.getAPIKeyEnvVar(service);
    const configLine = `${envVarName}=${apiKey}\n`;

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
      const existingLineIndex = lines.findIndex(line => line.startsWith(`${envVarName}=`));

      if (existingLineIndex >= 0) {
        lines[existingLineIndex] = `${envVarName}=${apiKey}`;
      } else {
        lines.push(`${envVarName}=${apiKey}`);
      }

      // 写回文件
      await writeFile(configFile, lines.join('\n'), 'utf-8');
    } catch (error) {
      throw new Error(`保存配置失败: ${error}`);
    }
  }

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(): Promise<ServiceStatusResponse> {
    try {
      // 获取当前AI服务
      const currentService = await this.callAIServiceManager('status');

      // 解析当前服务（从输出中提取）
      const currentServiceMatch = currentService.match(/当前AI服务:\s*(\w+)/);
      const current = (currentServiceMatch?.[1] || 'gemini') as AIService;

      // 检查所有服务的状态
      const services = await Promise.all([
        this.checkServiceStatus('gemini'),
        this.checkServiceStatus('opencode'),
        this.checkServiceStatus('claudecode'),
      ]);

      return {
        current_service: current,
        services,
        auto_switch_enabled: process.env.AI_AUTO_SWITCH !== 'false',
        global_config_path: join(process.env.HOME || '~', '.coderocket', 'env'),
        project_config_path: join(process.cwd(), '.env'),
      };
    } catch (error) {
      throw new Error(`获取AI服务状态失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查单个服务状态
   */
  private async checkServiceStatus(service: AIService) {
    try {
      // 检查服务是否可用
      const available = await this.isServiceAvailable(service);
      const configured = await this.isServiceConfigured(service);

      return {
        service,
        available,
        configured,
        install_command: this.getInstallCommand(service),
        config_command: this.getConfigCommand(service),
        error_message: !available ? `${service} 服务未安装或不可用` : undefined,
      };
    } catch (error) {
      return {
        service,
        available: false,
        configured: false,
        install_command: this.getInstallCommand(service),
        config_command: this.getConfigCommand(service),
        error_message: `检查 ${service} 状态时出错: ${error}`,
      };
    }
  }

  /**
   * 检查服务是否可用
   */
  private async isServiceAvailable(service: AIService): Promise<boolean> {
    try {
      const commands: Record<AIService, string> = {
        gemini: 'gemini --version',
        opencode: 'opencode --version',
        claudecode: 'claudecode --version',
      };

      await this.executeShellCommand(commands[service]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查服务是否已配置
   */
  private async isServiceConfigured(service: AIService): Promise<boolean> {
    const envVarName = this.getAPIKeyEnvVar(service);
    return !!process.env[envVarName];
  }

  /**
   * 获取安装命令
   */
  private getInstallCommand(service: AIService): string {
    const commands: Record<AIService, string> = {
      gemini: 'npm install -g @google/gemini-cli',
      opencode: 'npm install -g @opencode/cli',
      claudecode: 'npm install -g @anthropic-ai/claude-code',
    };
    return commands[service];
  }

  /**
   * 获取配置命令
   */
  private getConfigCommand(service: AIService): string {
    const commands: Record<AIService, string> = {
      gemini: 'gemini config',
      opencode: 'opencode config',
      claudecode: 'claudecode config',
    };
    return commands[service];
  }
}
