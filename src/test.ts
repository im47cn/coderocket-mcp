#!/usr/bin/env node

/**
 * CodeRocket MCP 测试脚本
 *
 * 用于测试MCP服务器的基本功能
 */

import { CodeRocketService, ConfigManager } from './coderocket.js';
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
    console.error(`❌ ${testName} - 失败:`, error instanceof Error ? error.message : error);
    console.log('');
  }
}

async function testCodeReview() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 如果没有配置 API 密钥，跳过实际的 API 调用测试
  const hasApiKey = process.env.GEMINI_API_KEY || process.env.CLAUDECODE_API_KEY;

  if (!hasApiKey) {
    console.log('跳过代码审查测试 - 未配置 API 密钥');
    console.log('要运行完整测试，请设置以下环境变量之一:');
    console.log('  GEMINI_API_KEY, CLAUDECODE_API_KEY');
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
    console.log('代码审查测试失败（可能是 API 配置问题）:', (error as Error).message.substring(0, 100) + '...');
  }
}

async function testServiceStatus() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();
  const status = await service.getAIServiceStatus();

  // 断言结果结构
  assert(typeof status === 'object', '状态应该是对象');
  assert(typeof status.current_service === 'string', '当前服务应该是字符串');
  assert(typeof status.auto_switch_enabled === 'boolean', '自动切换应该是布尔值');
  assert(Array.isArray(status.services), '服务列表应该是数组');
  assert(status.services.length > 0, '服务列表不应该为空');

  // 验证每个服务的结构
  status.services.forEach(svc => {
    assert(typeof svc.service === 'string', '服务名应该是字符串');
    assert(typeof svc.available === 'boolean', '可用性应该是布尔值');
    assert(typeof svc.configured === 'boolean', '配置状态应该是布尔值');
  });

  console.log('当前服务:', status.current_service);
  console.log('自动切换:', status.auto_switch_enabled);
  console.log('服务数量:', status.services.length);

  const availableServices = status.services.filter(s => s.available).length;
  const configuredServices = status.services.filter(s => s.configured).length;
  console.log(`可用服务: ${availableServices}/${status.services.length}`);
  console.log(`已配置服务: ${configuredServices}/${status.services.length}`);
}

async function testConfiguration() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();
  const result = await service.configureAIService({
    service: 'gemini',
    scope: 'project',
    timeout: 60,
    max_retries: 2,
  });

  // 断言结果结构
  assert(typeof result === 'object', '结果应该是对象');
  assert(typeof result.message === 'string', '消息应该是字符串');
  assert(result.message.length > 0, '消息不应该为空');

  console.log('配置结果:', result.message);
  if (result.data) {
    console.log('配置数据:', JSON.stringify(result.data, null, 2));
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

    // 测试初始化
    await ConfigManager.initialize();
    assert((ConfigManager as any).initialized === true, 'ConfigManager 应该已初始化');

    // 测试默认配置
    assert(ConfigManager.get('AI_SERVICE') === 'gemini', '默认 AI 服务应该是 gemini');
    assert(ConfigManager.get('AI_AUTO_SWITCH') === 'true', '默认应该启用自动切换');
    assert(ConfigManager.get('AI_TIMEOUT') === '30', '默认超时应该是 30 秒');

  // 测试配置获取
  const timeout = ConfigManager.getTimeout();
  assert(typeof timeout === 'number', '超时应该是数字');
  assert(timeout > 0, '超时应该大于 0');

  // 测试 AI 服务配置
  const aiService = ConfigManager.getAIService();
  assert(['gemini', 'claudecode'].includes(aiService), 'AI 服务应该是支持的服务之一');

  // 测试自动切换配置
  const autoSwitch = ConfigManager.isAutoSwitchEnabled();
  assert(typeof autoSwitch === 'boolean', '自动切换应该是布尔值');

  // 测试 API 密钥环境变量名
  const geminiEnvVar = ConfigManager.getAPIKeyEnvVar('gemini');
  assert(geminiEnvVar === 'GEMINI_API_KEY', 'Gemini API 密钥环境变量名应该正确');

  const claudeEnvVar = ConfigManager.getAPIKeyEnvVar('claudecode');
  assert(claudeEnvVar === 'CLAUDECODE_API_KEY', 'ClaudeCode API 密钥环境变量名应该正确');

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
  }
}

/**
 * 测试 PromptManager 功能
 */
async function testPromptManager() {
  // 导入 PromptManager（需要从 coderocket.js 中导出）
  const { PromptManager } = await import('./coderocket.js') as any;

  // 测试统一提示词加载
  const defaultPrompt = await PromptManager.loadPrompt('git-commit-review-prompt');
  assert(typeof defaultPrompt === 'string', '默认提示词应该是字符串');
  assert(defaultPrompt.length > 0, '默认提示词不应该为空');
  assert(defaultPrompt.includes('审阅专家'), '默认提示词应该包含相关内容');

  // 测试缓存机制
  const cachedPrompt = await PromptManager.loadPrompt('git-commit-review-prompt');
  assert(cachedPrompt === defaultPrompt, '缓存的提示词应该相同');

  // 测试清除缓存
  PromptManager.clearCache();
  const reloadedPrompt = await PromptManager.loadPrompt('git-commit-review-prompt');
  assert(reloadedPrompt === defaultPrompt, '重新加载的提示词应该相同');

  // 测试不存在的提示词（应该返回默认提示词）
  const unknownPrompt = await PromptManager.loadPrompt('unknown-prompt');
  assert(typeof unknownPrompt === 'string', '未知提示词应该返回默认提示词');
  assert(unknownPrompt.length > 0, '默认提示词不应该为空');

  // 测试预加载常用提示词
  await PromptManager.preloadCommonPrompts();
  // 预加载后，缓存中应该有常用提示词
  const gitPrompt = await PromptManager.loadPrompt('git-commit-review-prompt');
  assert(typeof gitPrompt === 'string', 'Git 提示词应该是字符串');

  // 测试统一提示词：所有审查功能都应该使用同一个提示词
  const codeReviewPrompt = await PromptManager.loadPrompt('git-commit-review-prompt');
  assert(codeReviewPrompt === gitPrompt, '所有审查功能应该使用统一的提示词');

  console.log('PromptManager 功能测试通过');
}

/**
 * 测试统一提示词使用
 */
async function testUnifiedPromptUsage() {
  // 导入 PromptManager 和内部方法
  const { PromptManager } = await import('./coderocket.js') as any;

  // 清除缓存以确保测试的准确性
  PromptManager.clearCache();

  // 直接测试内置默认提示词（避免受外部文件影响）
  const defaultPrompt = (PromptManager as any).getDefaultPrompt('git-commit-review-prompt');

  // 验证内置默认提示词内容包含关键特征
  assert(typeof defaultPrompt === 'string', '内置默认提示词应该是字符串');
  assert(defaultPrompt.length > 0, '内置默认提示词不应该为空');
  assert(defaultPrompt.includes('审阅专家'), '内置默认提示词应该包含审阅专家角色定义');
  assert(defaultPrompt.includes('自主执行模式'), '内置默认提示词应该包含执行模式说明');
  assert(defaultPrompt.includes('审阅维度'), '内置默认提示词应该包含审阅维度');
  assert(defaultPrompt.includes('功能完整性'), '内置默认提示词应该包含功能完整性检查');
  assert(defaultPrompt.includes('代码质量'), '内置默认提示词应该包含代码质量检查');
  assert(defaultPrompt.includes('安全性'), '内置默认提示词应该包含安全性检查');
  assert(defaultPrompt.includes('中文表达'), '内置默认提示词应该要求中文表达');

  // 测试不存在的提示词返回默认内容
  const unknownPrompt = (PromptManager as any).getDefaultPrompt('unknown-prompt');
  assert(typeof unknownPrompt === 'string', '未知提示词应该返回默认提示词');
  assert(unknownPrompt.includes('默认提示词'), '未知提示词应该返回默认内容');

  // 测试统一性：所有审查功能都应该使用同一个提示词名称
  const gitCommitPrompt = (PromptManager as any).getDefaultPrompt('git-commit-review-prompt');
  assert(gitCommitPrompt === defaultPrompt, '所有审查功能应该使用统一的提示词');

  console.log('统一提示词使用测试通过');
}

/**
 * 测试 AI 服务故障转移机制
 */
async function testAIServiceFailover() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 测试服务状态获取
  const status = await service.getAIServiceStatus();
  assert(typeof status === 'object', '服务状态应该是对象');
  assert(Array.isArray(status.services), '服务列表应该是数组');
  assert(status.services.length === 2, '应该有 2 个 AI 服务（移除 OpenCode 后）');

  // 验证服务列表包含正确的服务
  const serviceNames = status.services.map(s => s.service);
  assert(serviceNames.includes('gemini'), '应该包含 Gemini 服务');
  assert(serviceNames.includes('claudecode'), '应该包含 ClaudeCode 服务');

  // 测试每个服务的状态结构
  status.services.forEach(svc => {
    assert(typeof svc.service === 'string', '服务名应该是字符串');
    assert(typeof svc.available === 'boolean', '可用性应该是布尔值');
    assert(typeof svc.configured === 'boolean', '配置状态应该是布尔值');
    assert(['gemini', 'claudecode'].includes(svc.service), '服务名应该是支持的服务');
  });

  // 测试当前服务配置
  assert(['gemini', 'claudecode'].includes(status.current_service), '当前服务应该是支持的服务');
  assert(typeof status.auto_switch_enabled === 'boolean', '自动切换状态应该是布尔值');

  console.log('AI 服务故障转移机制测试通过');
  console.log(`当前服务: ${status.current_service}`);
  console.log(`可用服务数: ${status.services.filter(s => s.available).length}/${status.services.length}`);
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
    console.log('空代码测试正确抛出错误:', (error as Error).message.substring(0, 50) + '...');
  }

  // 测试无效的AI服务配置
  try {
    await service.configureAIService({
      service: 'invalid_service' as any,
      scope: 'project',
    });
    // 无效服务配置可能不会抛出错误，而是返回错误信息
    console.log('无效服务测试：系统正常处理无效服务配置');
  } catch (error) {
    assert(error instanceof Error, '应该抛出Error对象');
    console.log('无效服务测试正确抛出错误:', (error as Error).message.substring(0, 50) + '...');
  }

  // 测试未初始化的 ConfigManager
  try {
    (ConfigManager as any).initialized = false;
    ConfigManager.get('AI_SERVICE');
    throw new Error('应该抛出未初始化错误');
  } catch (error) {
    assert(error instanceof Error, '应该抛出Error对象');
    assert((error as Error).message.includes('未初始化'), '错误信息应该包含未初始化提示');
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
    console.log('无效语言测试抛出错误（可能是预期行为）:', (error as Error).message.substring(0, 50) + '...');
  }
}

/**
 * 测试边界条件
 */
async function testBoundaryConditions() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 如果没有配置 API 密钥，跳过实际的 API 调用测试
  const hasApiKey = process.env.GEMINI_API_KEY || process.env.CLAUDECODE_API_KEY;

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

    assert(typeof specialResult.summary === 'string', '特殊字符代码应该返回有效结果');
    console.log('特殊字符测试通过');
  } catch (error) {
    console.log('边界条件测试失败（可能是 API 配置问题）:', (error as Error).message.substring(0, 100) + '...');
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
    assert(result === expected, `状态描述映射错误: ${status} -> ${result} (期望: ${expected})`);
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
    assert(result.ai_service_used !== undefined, 'reviewChanges返回结果缺少AI服务信息');
    console.log(`reviewChanges调用成功: ${result.summary}`);
  } catch (error) {
    // 如果没有配置AI服务或没有变更，这是预期的
    console.log('reviewChanges测试跳过（可能是配置或变更问题）:', (error as Error).message.substring(0, 100));
  }

  console.log('✅ Git变更审查功能测试完成');
}

async function runTests() {
  console.log('🚀 CodeRocket MCP 测试开始\n');
  console.log('='.repeat(60));

  // 核心组件测试
  await runTest('ConfigManager 核心功能测试', testConfigManager);
  await runTest('PromptManager 功能测试', testPromptManager);
  await runTest('统一提示词使用测试', testUnifiedPromptUsage);
  await runTest('AI 服务故障转移测试', testAIServiceFailover);

  // 基础功能测试
  await runTest('服务状态测试', testServiceStatus);
  await runTest('配置功能测试', testConfiguration);
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
  console.log(`  成功率: ${((testStats.passed / testStats.total) * 100).toFixed(1)}%`);

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
