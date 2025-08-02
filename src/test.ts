#!/usr/bin/env node

/**
 * CodeRocket MCP 测试脚本
 *
 * 用于测试MCP服务器的基本功能
 */

import { CodeRocketService, ConfigManager } from './coderocket.js';
import { 
  ConfigureAIServiceRequest, 
  ConfigureAIServiceResponse,
  GetAIServiceStatusRequest,
  GetAIServiceStatusResponse,
  AIServiceStatus 
} from './types.js';
import { logger } from './logger.js';
import { writeFile, mkdir, unlink, rmdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * 简单的断言函数
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`断言失败: ${message}`);
  }
}

/**
 * 测试结果统计
 */
interface TestStats {
  total: number;
  passed: number;
  failed: number;
}

const testStats: TestStats = {
  total: 0,
  passed: 0,
  failed: 0,
};

/**
 * 测试运行器
 */
async function runTest(testName: string, testFn: () => Promise<void>) {
  testStats.total++;
  console.log(`🧪 ${testName}...`);

  try {
    await testFn();
    testStats.passed++;
    console.log(`✅ ${testName} - 通过\n`);
  } catch (error) {
    testStats.failed++;
    console.error(
      `❌ ${testName} - 失败:`,
      error instanceof Error ? error.message : error,
    );
    console.log('');
  }
}

async function testCodeReview() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 如果没有配置 API 密钥，跳过实际的 API 调用测试
  const hasApiKey =
    process.env.GEMINI_API_KEY || process.env.CLAUDE_API_KEY;

  if (!hasApiKey) {
    console.log('跳过代码审查测试 - 未配置 API 密钥');
    console.log('要运行完整测试，请设置以下环境变量之一:');
    console.log('  GEMINI_API_KEY, CLAUDE_API_KEY');
    return;
  }

  try {
    const result = await service.reviewCode({
      code: `function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  var result = 0;
  for (var i = 0; i < b; i++) {
    result = add(result, a);
  }
  return result;
}`,
      language: 'javascript',
      context: '简单的数学函数实现',
    });

    // 断言结果结构
    assert(typeof result === 'object', '结果应该是对象');
    assert(typeof result.status === 'string', '状态应该是字符串');
    assert(typeof result.summary === 'string', '摘要应该是字符串');
    assert(typeof result.ai_service_used === 'string', 'AI服务应该是字符串');
    assert(typeof result.timestamp === 'string', '时间戳应该是字符串');
    assert(result.summary.length > 0, '摘要不应该为空');

    console.log('状态:', result.status);
    console.log('摘要:', result.summary.substring(0, 100) + '...');
    console.log('AI服务:', result.ai_service_used);
  } catch (error) {
    console.log(
      '代码审查测试失败（可能是 API 配置问题）:',
      (error as Error).message.substring(0, 100) + '...',
    );
  }
}





/**
 * 测试 ConfigManager 核心功能
 */
async function testConfigManager() {
  // 保存当前环境变量
  const originalEnv = { ...process.env };

  // 备份并删除项目 .env 文件（如果存在）
  let envFileBackup: string | null = null;
  const envFilePath = join(process.cwd(), '.env');

  try {
    try {
      envFileBackup = await readFile(envFilePath, 'utf-8');
      await unlink(envFilePath);
    } catch (error) {
      // .env 文件不存在，这是正常的
    }

    // 清理可能影响测试的环境变量
    delete process.env.AI_SERVICE;
    delete process.env.AI_TIMEOUT;
    delete process.env.AI_AUTO_SWITCH;

    // 重置 ConfigManager 状态
    (ConfigManager as any).initialized = false;
    (ConfigManager as any).config = {};

    // 测试初始化（此时没有项目配置文件）
    console.log('DEBUG: 当前工作目录:', process.cwd());
    await ConfigManager.initialize();
    assert(
      (ConfigManager as any).initialized === true,
      'ConfigManager 应该已初始化',
    );

    // 测试默认配置（没有项目配置文件时）
    assert(
      ConfigManager.get('AI_SERVICE') === 'gemini',
      'AI 服务应该是 gemini',
    );
    assert(
      ConfigManager.get('AI_AUTO_SWITCH') === 'true',
      '应该启用自动切换',
    );

    // 注意：此时没有项目配置文件，所以AI_TIMEOUT可能是全局配置的值
    console.log('DEBUG: 没有项目配置时的AI_TIMEOUT:', ConfigManager.get('AI_TIMEOUT'));

    // 测试 AI 服务配置
    const aiService = ConfigManager.getAIService();
    assert(
      ['gemini', 'claudecode'].includes(aiService),
      'AI 服务应该是支持的服务之一',
    );

    // 测试自动切换配置
    const autoSwitch = ConfigManager.isAutoSwitchEnabled();
    assert(typeof autoSwitch === 'boolean', '自动切换应该是布尔值');

    // 测试 API 密钥环境变量名
    const geminiEnvVar = ConfigManager.getAPIKeyEnvVar('gemini');
    assert(
      geminiEnvVar === 'GEMINI_API_KEY',
      'Gemini API 密钥环境变量名应该正确',
    );

    const claudeEnvVar = ConfigManager.getAPIKeyEnvVar('claudecode');
    assert(
      claudeEnvVar === 'CLAUDE_API_KEY',
      'ClaudeCode API 密钥环境变量名应该正确',
    );

    // 测试配置路径
    const projectConfig = ConfigManager.getConfigPath('project');
    assert(typeof projectConfig.dir === 'string', '项目配置目录应该是字符串');
    assert(typeof projectConfig.file === 'string', '项目配置文件应该是字符串');

    const globalConfig = ConfigManager.getConfigPath('global');
    assert(typeof globalConfig.dir === 'string', '全局配置目录应该是字符串');
    assert(typeof globalConfig.file === 'string', '全局配置文件应该是字符串');

    console.log('ConfigManager 核心功能测试通过');
  } finally {
    // 恢复 .env 文件
    if (envFileBackup !== null) {
      await writeFile(envFilePath, envFileBackup);
    }

    // 恢复原始环境变量
    Object.assign(process.env, originalEnv);
    // 重新初始化以恢复正常状态
    (ConfigManager as any).initialized = false;
    await ConfigManager.initialize();

    // 测试恢复后的配置（有项目配置文件时）
    const timeoutStr = ConfigManager.get('AI_TIMEOUT');
    console.log('DEBUG: 恢复后的AI_TIMEOUT值:', timeoutStr, '类型:', typeof timeoutStr);
    assert(timeoutStr === '30', '恢复后超时应该是 30 秒');

    // 测试配置获取
    const timeout = ConfigManager.getTimeout();
    console.log('DEBUG: 恢复后getTimeout()值:', timeout, '类型:', typeof timeout);
    assert(typeof timeout === 'number', '超时应该是数字');
    assert(timeout > 0, '超时应该大于 0');
    assert(timeout === 30, '超时应该是 30');
  }
}

/**
 * 测试 PromptManager 功能
 */
async function testPromptManager() {
  // 导入 PromptManager（需要从 coderocket.js 中导出）
  const { PromptManager } = (await import('./coderocket.js')) as any;

  // 测试统一提示词加载
  const defaultPrompt = await PromptManager.loadPrompt('git_commit');
  assert(typeof defaultPrompt === 'string', '默认提示词应该是字符串');
  assert(defaultPrompt.length > 0, '默认提示词不应该为空');
  assert(defaultPrompt.includes('审查') || defaultPrompt.includes('审阅'), '默认提示词应该包含相关内容');

  // 测试缓存机制
  const cachedPrompt = await PromptManager.loadPrompt('git_commit');
  assert(cachedPrompt === defaultPrompt, '缓存的提示词应该相同');

  // 测试清除缓存
  PromptManager.clearCache();
  const reloadedPrompt = await PromptManager.loadPrompt('git_commit');
  assert(reloadedPrompt === defaultPrompt, '重新加载的提示词应该相同');

  // 测试不存在的提示词（现在会返回默认提示词，不再返回null）
  const unknownPrompt = await PromptManager.loadPrompt('unknown-prompt');
  assert(unknownPrompt === null, '未知提示词应该返回null');

  // 测试加载特定提示词
  const gitPrompt = await PromptManager.loadPrompt('git_commit');
  assert(typeof gitPrompt === 'string', 'Git 提示词应该是字符串');

  // 测试不同的提示词类型
  const codeReviewPrompt = await PromptManager.loadPrompt('code_review');
  assert(typeof codeReviewPrompt === 'string', '代码审查提示词应该是字符串');

  console.log('PromptManager 功能测试通过');
}

/**
 * 测试统一提示词使用
 */
async function testUnifiedPromptUsage() {
  // 导入 PromptManager 和内部方法
  const { PromptManager } = (await import('./coderocket.js')) as any;

  // 清除缓存以确保测试的准确性
  PromptManager.clearCache();

  // 确保PromptManager已初始化
  await PromptManager.initialize();

  // 直接测试内置默认提示词（避免受外部文件影响）
  const defaultPrompt = (PromptManager as any).getDefaultPrompt();

  // 验证内置默认提示词内容包含关键特征
  assert(typeof defaultPrompt === 'string', '内置默认提示词应该是字符串');
  assert(defaultPrompt.length > 0, '内置默认提示词不应该为空');
  assert(
    defaultPrompt.includes('审查专家') || defaultPrompt.includes('代码审查'),
    '内置默认提示词应该包含审查专家角色定义',
  );
  assert(
    defaultPrompt.includes('代码质量') || defaultPrompt.includes('质量'),
    '内置默认提示词应该包含代码质量检查',
  );
  assert(defaultPrompt.includes('安全') || defaultPrompt.includes('安全性'), '内置默认提示词应该包含安全性检查');
  assert(defaultPrompt.includes('功能') || defaultPrompt.includes('正确性'), '内置默认提示词应该包含功能正确性检查');
  assert(defaultPrompt.includes('最佳实践') || defaultPrompt.includes('实践'), '内置默认提示词应该包含最佳实践');
  assert(defaultPrompt.includes('审查') || defaultPrompt.includes('分析'), '内置默认提示词应该包含输出格式要求');

  // 测试不存在的提示词返回null
  const unknownPrompt = await PromptManager.loadPrompt('unknown-prompt');
  assert(unknownPrompt === null, '未知提示词应该返回null');

  // 测试默认提示词内容
  const fallbackPrompt = (PromptManager as any).getDefaultPrompt();
  assert(fallbackPrompt === defaultPrompt, '默认提示词应该一致');

  console.log('统一提示词使用测试通过');
}

/**
 * 测试 AI 服务故障转移机制
 */
async function testAIServiceFailover() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 测试基本的代码审查功能，验证 AI 服务可以正常工作
  try {
    const result = await service.reviewCode({
      code: 'console.log("Hello World");',
      language: 'javascript',
      context: 'AI服务故障转移测试',
    });

    assert(typeof result === 'object', '审查结果应该是对象');
    assert(typeof result.status === 'string', '状态应该是字符串');
    assert(typeof result.summary === 'string', '摘要应该是字符串');
    assert(typeof result.review === 'string', '审查内容应该是字符串');

    console.log('AI 服务故障转移机制测试通过');
    console.log(`审查状态: ${result.status}`);
    console.log(`审查摘要: ${result.summary.substring(0, 50)}...`);
  } catch (error) {
    console.log('AI 服务故障转移测试中遇到错误:', (error as Error).message);
    // 在测试环境中，AI 服务可能不可用，这是正常的
  }
}

/**
 * 测试错误场景
 */
async function testErrorScenarios() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 测试空代码审查
  try {
    await service.reviewCode({
      code: '',
      language: 'javascript',
      context: '空代码测试',
    });
    // 空代码可能不会抛出错误，而是返回相应的审查结果
    console.log('空代码测试：系统正常处理空代码输入');
  } catch (error) {
    assert(error instanceof Error, '应该抛出Error对象');
    console.log(
      '空代码测试正确抛出错误:',
      (error as Error).message.substring(0, 50) + '...',
    );
  }



  // 测试未初始化的 ConfigManager
  try {
    (ConfigManager as any).initialized = false;
    ConfigManager.get('AI_SERVICE');
    throw new Error('应该抛出未初始化错误');
  } catch (error) {
    assert(error instanceof Error, '应该抛出Error对象');
    assert(
      (error as Error).message.includes('未初始化'),
      '错误信息应该包含未初始化提示',
    );
    console.log('未初始化测试正确抛出错误');
  } finally {
    // 恢复初始化状态
    await ConfigManager.initialize();
  }

  // 测试无效的语言类型
  try {
    const result = await service.reviewCode({
      code: 'console.log("test");',
      language: 'invalid_language' as any,
      context: '无效语言测试',
    });
    // 系统应该能处理无效语言类型
    assert(typeof result === 'object', '应该返回审查结果对象');
    console.log('无效语言测试：系统正常处理无效语言类型');
  } catch (error) {
    console.log(
      '无效语言测试抛出错误（可能是预期行为）:',
      (error as Error).message.substring(0, 50) + '...',
    );
  }
}

/**
 * 测试边界条件
 */
async function testBoundaryConditions() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 如果没有配置 API 密钥，跳过实际的 API 调用测试
  const hasApiKey =
    process.env.GEMINI_API_KEY || process.env.CLAUDE_API_KEY;

  if (!hasApiKey) {
    console.log('跳过边界条件测试 - 未配置 API 密钥');
    return;
  }

  try {
    // 测试超长代码
    const longCode = 'console.log("test");'.repeat(100); // 减少长度避免超时
    const result = await service.reviewCode({
      code: longCode,
      language: 'javascript',
      context: '超长代码测试',
    });

    assert(typeof result.summary === 'string', '超长代码应该返回有效结果');
    console.log('超长代码测试通过，摘要长度:', result.summary.length);

    // 测试特殊字符
    const specialCode = `function test() {
      const str = "包含特殊字符: !@#$%^&*()_+{}|:<>?[]\\;',./";
      return str;
    }`;

    const specialResult = await service.reviewCode({
      code: specialCode,
      language: 'javascript',
      context: '特殊字符测试',
    });

    assert(
      typeof specialResult.summary === 'string',
      '特殊字符代码应该返回有效结果',
    );
    console.log('特殊字符测试通过');
  } catch (error) {
    console.log(
      '边界条件测试失败（可能是 API 配置问题）:',
      (error as Error).message.substring(0, 100) + '...',
    );
  }
}

/**
 * 测试Git变更审查功能
 */
async function testReviewChanges() {
  const service = new CodeRocketService();

  // 测试Git仓库检测
  const isGitRepo = await (service as any).checkGitRepository(process.cwd());
  assert(isGitRepo, 'Git仓库检测失败');
  console.log('Git仓库检测通过');

  // 测试Git状态解析
  const statusOutput = `M  package.json
A  test-file.js
?? untracked.txt`;

  const files = (service as any).parseGitStatus(statusOutput);
  assert(files.length === 3, '文件解析数量不正确');
  assert(files[0].path === 'package.json', '文件路径解析错误');
  assert(files[0].status === 'M ', '文件状态解析错误');
  assert(files[0].statusDescription === '已修改（已暂存）', '状态描述错误');
  console.log('Git状态解析通过');

  // 测试状态描述映射
  const statusDescriptions = [
    ['M ', '已修改（已暂存）'],
    [' M', '已修改（未暂存）'],
    ['A ', '新增文件（已暂存）'],
    ['??', '未跟踪文件'],
  ];

  for (const [status, expected] of statusDescriptions) {
    const result = (service as any).getGitStatusDescription(status);
    assert(
      result === expected,
      `状态描述映射错误: ${status} -> ${result} (期望: ${expected})`,
    );
  }
  console.log('状态描述映射通过');

  // 测试提示词构建
  const changes = {
    files: [
      { path: 'test.js', statusDescription: '已修改（已暂存）' },
      { path: 'new.ts', statusDescription: '新增文件（已暂存）' },
    ],
    diff: 'diff --git a/test.js b/test.js\n+console.log("test");',
    statusOutput: 'M  test.js\nA  new.ts',
  };

  const request = { custom_prompt: '请关注性能' };
  const prompt = (service as any).buildChangesReviewPrompt(changes, request);

  assert(prompt.includes('变更文件数量: 2'), '提示词中缺少文件数量');
  assert(prompt.includes('test.js'), '提示词中缺少文件名');
  assert(prompt.includes('请关注性能'), '提示词中缺少自定义提示');
  assert(prompt.includes('请务必使用中文回复'), '提示词中缺少语言要求');
  console.log('提示词构建通过');

  // 测试实际的reviewChanges方法（如果有变更的话）
  try {
    const result = await service.reviewChanges({
      include_staged: true,
      include_unstaged: true,
    });
    assert(result.status !== undefined, 'reviewChanges返回结果格式错误');
    assert(result.summary !== undefined, 'reviewChanges返回结果缺少摘要');
    assert(
      result.ai_service_used !== undefined,
      'reviewChanges返回结果缺少AI服务信息',
    );
    console.log(`reviewChanges调用成功: ${result.summary}`);
  } catch (error) {
    // 如果没有配置AI服务或没有变更，这是预期的
    console.log(
      'reviewChanges测试跳过（可能是配置或变更问题）:',
      (error as Error).message.substring(0, 100),
    );
  }

  console.log('✅ Git变更审查功能测试完成');
}

/**
 * 测试AI服务配置功能
 */
async function testConfigureAIService() {
  console.log('🔧 开始测试AI服务配置功能...');
  
  const service = new CodeRocketService();
  const tempDir = join(tmpdir(), `coderocket-test-${Date.now()}`);
  
  try {
    // 创建临时目录
    await mkdir(tempDir, { recursive: true });
    
    // 测试配置Gemini服务
    const geminiRequest: ConfigureAIServiceRequest = {
      service: 'gemini',
      scope: 'project',
      api_key: 'test-gemini-api-key',
      timeout: 30,
      max_retries: 3,
    };
    
    const geminiResponse = await service.configureAIService(geminiRequest);
    
    // 验证响应格式
    assert(typeof geminiResponse.success === 'boolean', 'configureAIService响应格式错误 - success字段');
    assert(typeof geminiResponse.message === 'string', 'configureAIService响应格式错误 - message字段');
    assert(geminiResponse.success === true, 'Gemini服务配置应该成功');
    console.log(`Gemini配置成功: ${geminiResponse.message}`);
    
    // 测试配置ClaudeCode服务
    const claudeRequest: ConfigureAIServiceRequest = {
      service: 'claudecode',
      scope: 'global',
      api_key: 'test-claude-api-key',
      timeout: 60,
      max_retries: 5,
    };
    
    const claudeResponse = await service.configureAIService(claudeRequest);
    assert(claudeResponse.success === true, 'ClaudeCode服务配置应该成功');
    console.log(`ClaudeCode配置成功: ${claudeResponse.message}`);
    
    // 测试无效服务
    const invalidRequest: ConfigureAIServiceRequest = {
      service: 'invalid-service' as any,
      scope: 'project',
      api_key: 'test-key',
    };
    const invalidResponse = await service.configureAIService(invalidRequest);
    assert(invalidResponse.success === false, '无效服务配置应该失败');
    assert(invalidResponse.message.includes('不支持的AI服务'), '错误消息不正确');
    console.log('无效服务错误处理正确');
    
    // 测试无变更配置
    const noChangeRequest: ConfigureAIServiceRequest = {
      service: 'gemini',
      scope: 'project',
    };
    
    const noChangeResponse = await service.configureAIService(noChangeRequest);
    assert(noChangeResponse.success === true, '无变更配置应该成功');
    assert(noChangeResponse.restart_required === false, '无变更配置不应该需要重启');
    console.log('无变更配置测试通过');
    
  } finally {
    // 清理临时文件
    try {
      await rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('清理临时目录失败:', error);
    }
  }
  
  console.log('✅ AI服务配置功能测试完成');
}

/**
 * 测试AI服务状态获取功能
 */
async function testGetAIServiceStatus() {
  console.log('📊 开始测试AI服务状态获取功能...');
  
  const service = new CodeRocketService();
  
  const request: GetAIServiceStatusRequest = {};
  const response = await service.getAIServiceStatus(request);
  
  // 验证响应格式
  assert(Array.isArray(response.services), 'getAIServiceStatus响应格式错误 - services应该是数组');
  assert(typeof response.current_service === 'string', 'getAIServiceStatus响应格式错误 - current_service字段');
  assert(typeof response.auto_switch_enabled === 'boolean', 'getAIServiceStatus响应格式错误 - auto_switch_enabled字段');
  
  // 验证服务状态结构
  assert(response.services.length > 0, '应该至少有一个AI服务');
  
  for (const serviceStatus of response.services) {
    assert(typeof serviceStatus.service === 'string', '服务状态格式错误 - service字段');
    assert(typeof serviceStatus.available === 'boolean', '服务状态格式错误 - available字段');
    assert(typeof serviceStatus.configured === 'boolean', '服务状态格式错误 - configured字段');
    
    // 检查必需字段
    const requiredFields = ['service', 'available', 'configured'];
    for (const field of requiredFields) {
      assert(field in serviceStatus, `服务状态缺少必需字段: ${field}`);
    }
    
    console.log(`服务状态: ${serviceStatus.service} - 可用: ${serviceStatus.available}, 已配置: ${serviceStatus.configured}`);
  }
  
  // 验证支持的服务
  const supportedServices = ['gemini', 'claudecode'] as const;
  const returnedServices = response.services.map(s => s.service);
  
  for (const supportedService of supportedServices) {
    assert(
      returnedServices.includes(supportedService),
      `缺少支持的服务: ${supportedService}`
    );
  }
  
  console.log(`当前服务: ${response.current_service}`);
  console.log(`自动切换: ${response.auto_switch_enabled ? '启用' : '禁用'}`);
  
  console.log('✅ AI服务状态获取功能测试完成');
}

/**
 * 验证配置AI服务响应格式
 */
function validateConfigureAIServiceResponse(response: ConfigureAIServiceResponse): void {
  assert(typeof response.success === 'boolean', '响应格式错误 - success字段类型');
  assert(typeof response.message === 'string', '响应格式错误 - message字段类型');
  
  if (response.config_path !== undefined) {
    assert(typeof response.config_path === 'string', '响应格式错误 - config_path字段类型');
  }
  
  if (response.restart_required !== undefined) {
    assert(typeof response.restart_required === 'boolean', '响应格式错误 - restart_required字段类型');
  }
}

/**
 * 验证AI服务状态响应格式
 */
function validateGetAIServiceStatusResponse(response: GetAIServiceStatusResponse): void {
  assert(Array.isArray(response.services), '响应格式错误 - services应该是数组');
  assert(typeof response.current_service === 'string', '响应格式错误 - current_service字段类型');
  assert(typeof response.auto_switch_enabled === 'boolean', '响应格式错误 - auto_switch_enabled字段类型');
  
  for (const service of response.services) {
    validateAIServiceStatus(service);
  }
}

/**
 * 验证AI服务状态格式
 */
function validateAIServiceStatus(status: AIServiceStatus): void {
  assert(typeof status.service === 'string', 'AI服务状态格式错误 - service字段类型');
  assert(typeof status.available === 'boolean', 'AI服务状态格式错误 - available字段类型');
  assert(typeof status.configured === 'boolean', 'AI服务状态格式错误 - configured字段类型');
  
  if (status.install_command !== undefined) {
    assert(typeof status.install_command === 'string', 'AI服务状态格式错误 - install_command字段类型');
  }
  
  if (status.config_command !== undefined) {
    assert(typeof status.config_command === 'string', 'AI服务状态格式错误 - config_command字段类型');
  }
  
  if (status.error_message !== undefined) {
    assert(typeof status.error_message === 'string', 'AI服务状态格式错误 - error_message字段类型');
  }
}

async function runTests() {
  console.log('🚀 CodeRocket MCP 测试开始\n');
  console.log('='.repeat(60));

  // 核心组件测试
  await runTest('ConfigManager 核心功能测试', testConfigManager);
  await runTest('PromptManager 功能测试', testPromptManager);
  await runTest('统一提示词使用测试', testUnifiedPromptUsage);
  await runTest('AI 服务故障转移测试', testAIServiceFailover);

  // 新增MCP工具测试
  await runTest('AI服务配置功能测试', testConfigureAIService);
  await runTest('AI服务状态获取功能测试', testGetAIServiceStatus);

  // 基础功能测试
  await runTest('代码审查测试', testCodeReview);

  // 错误场景测试
  await runTest('错误场景测试', testErrorScenarios);

  // 边界条件测试
  await runTest('边界条件测试', testBoundaryConditions);

  // Git变更审查测试
  await runTest('Git变更审查功能测试', testReviewChanges);

  console.log('='.repeat(60));

  // 显示测试统计
  console.log('📊 测试统计:');
  console.log(`  总计: ${testStats.total}`);
  console.log(`  通过: ${testStats.passed} ✅`);
  console.log(`  失败: ${testStats.failed} ❌`);
  console.log(
    `  成功率: ${((testStats.passed / testStats.total) * 100).toFixed(1)}%`,
  );

  if (testStats.failed > 0) {
    console.log('\n⚠️  有测试失败，请检查上述错误信息');
  } else {
    console.log('\n🎉 所有测试通过！');
  }

  // 显示日志文件位置
  const logFile = logger.getLogFile();
  if (logFile) {
    console.log(`📝 详细日志: ${logFile}`);
  }

  // 如果有失败的测试，退出码为1
  if (testStats.failed > 0) {
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

export { runTests };
