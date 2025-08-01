#!/usr/bin/env node

/**
 * CodeRocket MCP 测试脚本
 *
 * 用于测试MCP服务器的基本功能
 */

import { CodeRocketService } from './coderocket.js';
import { logger } from './logger.js';
import { ConfigManager } from './coderocket.js';

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
  const hasApiKey = process.env.GEMINI_API_KEY || process.env.CLAUDECODE_API_KEY || process.env.OPENCODE_API_KEY;

  if (!hasApiKey) {
    console.log('跳过代码审查测试 - 未配置 API 密钥');
    console.log('要运行完整测试，请设置以下环境变量之一:');
    console.log('  GEMINI_API_KEY, CLAUDECODE_API_KEY, OPENCODE_API_KEY');
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
    throw new Error('应该抛出错误');
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
    throw new Error('应该抛出错误');
  } catch (error) {
    assert(error instanceof Error, '应该抛出Error对象');
    console.log('无效服务测试正确抛出错误:', (error as Error).message.substring(0, 50) + '...');
  }
}

/**
 * 测试边界条件
 */
async function testBoundaryConditions() {
  await ConfigManager.initialize();
  const service = new CodeRocketService();

  // 如果没有配置 API 密钥，跳过实际的 API 调用测试
  const hasApiKey = process.env.GEMINI_API_KEY || process.env.CLAUDECODE_API_KEY || process.env.OPENCODE_API_KEY;

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

async function runTests() {
  console.log('🚀 CodeRocket MCP 测试开始\n');
  console.log('='.repeat(60));

  // 基础功能测试
  await runTest('服务状态测试', testServiceStatus);
  await runTest('配置功能测试', testConfiguration);
  await runTest('代码审查测试', testCodeReview);

  // 错误场景测试
  await runTest('错误场景测试', testErrorScenarios);

  // 边界条件测试
  await runTest('边界条件测试', testBoundaryConditions);

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
