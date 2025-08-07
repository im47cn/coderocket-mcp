import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 提示词管理器
 *
 * 支持层级查找和coderocket-cli兼容的提示词管理：
 * 1. 项目级提示词 (./prompts/)
 * 2. 全局级提示词 (~/.coderocket/prompts/)
 * 3. 默认提示词 (内置)
 *
 * 兼容coderocket-cli的文件命名方式，支持两个项目共享提示词文件
 */
export class PromptManager {
  private static prompts: Map<string, string> = new Map();
  private static initialized = false;

  // 功能名到文件名的映射（统一使用git-commit-review-prompt.md）
  // 所有审查功能使用同一个高质量的提示词，区别仅在于被审查的内容
  private static readonly PROMPT_FILE_MAPPING: Record<string, string> = {
    'git_commit': 'git-commit-review-prompt.md',
    'review_commit': 'git-commit-review-prompt.md',
    'code_review': 'git-commit-review-prompt.md',
    'review_code': 'git-commit-review-prompt.md',
    'review_changes': 'git-commit-review-prompt.md',
    'git_changes': 'git-commit-review-prompt.md',
    'review_files': 'git-commit-review-prompt.md',
    'file_review': 'git-commit-review-prompt.md',
    'base': 'git-commit-review-prompt.md', // 统一使用专业的代码审查提示词
  };

  /**
   * 初始化提示词系统
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('初始化提示词管理器');
    await this.loadPrompts();
    this.initialized = true;
    logger.info('提示词管理器初始化完成', {
      promptCount: this.prompts.size,
    });
  }

  /**
   * 加载所有提示词
   */
  private static async loadPrompts(): Promise<void> {
    // 加载所有映射的提示词
    for (const [key, filename] of Object.entries(this.PROMPT_FILE_MAPPING)) {
      await this.loadPromptWithFallback(key, filename);
    }
  }

  /**
   * 层级加载提示词文件：项目级 -> 全局级 -> 默认值
   */
  private static async loadPromptWithFallback(key: string, filename: string): Promise<void> {
    // 1. 尝试从项目级prompts目录加载
    const projectPromptsDir = join(process.cwd(), 'prompts');
    if (await this.tryLoadPromptFile(projectPromptsDir, filename, key)) {
      return;
    }

    // 2. 尝试从全局~/.coderocket/prompts目录加载
    const globalPromptsDir = join(homedir(), '.coderocket', 'prompts');
    if (await this.tryLoadPromptFile(globalPromptsDir, filename, key)) {
      return;
    }

    // 3. 使用默认提示词
    logger.warn(`提示词文件不存在: ${filename}，使用默认提示词`);
    this.setDefaultPrompt(key);
  }

  /**
   * 尝试从指定目录加载提示词文件
   */
  private static async tryLoadPromptFile(
    dir: string,
    filename: string,
    key: string
  ): Promise<boolean> {
    try {
      const filePath = join(dir, filename);

      // 检查文件是否存在
      await access(filePath);

      // 读取文件内容
      const content = await readFile(filePath, 'utf-8');
      this.prompts.set(key, content.trim());
      logger.debug(`提示词加载成功: ${key}`, { path: filePath });
      return true;
    } catch (error) {
      // 文件不存在或读取失败，返回false继续尝试下一级
      return false;
    }
  }

  /**
   * 设置默认提示词
   */
  private static setDefaultPrompt(key: string): void {
    const defaultPrompts: Record<string, string> = {
      base: `你是一个专业的代码审查专家，请对提供的代码进行详细分析。`,
      code_review: `# 专业代码审查

作为专业的代码审查专家，请对提供的代码片段进行深度分析，包括：

## 审查维度
1. **代码正确性** - 逻辑是否正确，是否存在bug
2. **代码质量** - 结构是否清晰，命名是否规范
3. **性能考虑** - 是否存在性能瓶颈
4. **安全性** - 是否存在安全漏洞
5. **可维护性** - 代码可读性和可扩展性
6. **代码规范** - 是否符合编码规范

请提供具体的改进建议和最佳实践建议。`,

      git_changes: `# Git变更审查

请对Git仓库中的变更进行专业审查，重点关注：

## 审查重点
1. **变更完整性** - 是否所有相关文件都被正确修改
2. **变更一致性** - 变更在不同文件中的一致性
3. **影响范围评估** - 变更对其他模块的影响
4. **代码质量** - 实现质量和安全性检查
5. **测试覆盖** - 是否需要补充测试
6. **文档更新** - 是否需要更新相关文档

请提供全面的变更评估和改进建议。`,

      git_commit: `# Git提交审查

作为资深的代码审阅专家，请对Git提交进行专业、深入的审查：

## 审查维度
1. **目标达成度** - 是否完整实现了提交目标
2. **功能完整性** - 功能实现是否正确完整
3. **代码质量** - 代码结构和规范性
4. **可维护性** - 代码的可读性和可维护性
5. **扩展性** - 设计的可扩展性

请提供详细的审查报告和改进建议。`,

      file_review: `# 多文件综合审查

请对多个文件进行综合性的代码质量评估：

## 审查维度
1. **架构一致性** - 文件间的架构设计一致性
2. **依赖关系** - 文件间的依赖关系是否合理
3. **代码复用** - 是否存在重复代码
4. **命名一致性** - 命名规范是否统一
5. **错误处理** - 错误处理策略是否一致
6. **性能协调** - 文件间的性能配合

请提供整体架构评估和改进建议。`,

      review_code: `作为专业的代码审查专家，请对提供的代码片段进行深度分析。`,
      review_changes: `请对Git仓库中的变更进行专业审查。`,
      review_commit: `请对指定的Git提交进行详细分析。`,
      review_files: `请对多个文件进行综合性代码质量评估。`,
    };

    const defaultPrompt = defaultPrompts[key] || defaultPrompts.base;
    this.prompts.set(key, defaultPrompt);
    logger.debug(`使用默认提示词: ${key}`);
  }

  /**
   * 加载单个提示词（公共方法，用于测试）
   */
  static async loadPrompt(key: string): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.prompts.get(key) || null;
  }

  /**
   * 清除缓存（用于测试）
   */
  static clearCache(): void {
    this.prompts.clear();
    this.initialized = false;
  }

  /**
   * 获取默认提示词（用于测试）
   */
  static getDefaultPrompt(): string {
    return this.prompts.get('base') || '请对代码进行审查';
  }

  /**
   * 获取提示词文件的查找路径（用于调试）
   */
  static getPromptPaths(filename: string): string[] {
    return [
      join(process.cwd(), 'prompts', filename),
      join(homedir(), '.coderocket', 'prompts', filename),
    ];
  }

  /**
   * 获取提示词
   */
  static getPrompt(key: string, variables?: Record<string, string>): string {
    if (!this.initialized) {
      throw new Error('PromptManager 未初始化，请先调用 initialize()');
    }

    let prompt = this.prompts.get(key);
    if (!prompt) {
      logger.warn(`提示词不存在: ${key}，使用默认提示词`);
      prompt = this.prompts.get('base') || '请分析提供的内容。';
    }

    // 替换变量
    if (variables) {
      for (const [varKey, value] of Object.entries(variables)) {
        const placeholder = `{${varKey}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    return prompt;
  }

  /**
   * 构建完整的提示词
   */
  static buildPrompt(
    toolKey: string,
    content: string,
    customPrompt?: string,
    language?: string
  ): string {
    // 如果有自定义提示词，直接使用
    if (customPrompt) {
      return customPrompt.replace('{content}', content);
    }

    // 获取基础提示词
    const basePrompt = this.getPrompt('base');
    const toolPrompt = this.getPrompt(toolKey);

    // 语言设置
    const languageInstruction = language
      ? `请使用${language}回复。`
      : '请使用中文回复。';

    // 组合提示词
    return `${basePrompt}

${toolPrompt}

${languageInstruction}

内容：
${content}`;
  }

  /**
   * 获取所有可用的提示词键
   */
  static getAvailablePrompts(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * 检查提示词是否存在
   */
  static hasPrompt(key: string): boolean {
    return this.prompts.has(key);
  }

  /**
   * 动态设置提示词（用于测试或运行时修改）
   */
  static setPrompt(key: string, content: string): void {
    this.prompts.set(key, content);
    logger.debug(`动态设置提示词: ${key}`);
  }

  /**
   * 清除所有提示词（用于测试）
   */
  static clear(): void {
    this.prompts.clear();
    this.initialized = false;
  }
}
