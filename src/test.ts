#!/usr/bin/env node

/**
 * CodeRocket MCP 测试脚本
 * 
 * 用于测试MCP服务器的基本功能
 */

import { CodeRocketService } from './coderocket.js';
import { logger } from './logger.js';

async function testCodeReview() {
  console.log('🧪 测试代码审查功能...\n');
  
  const service = new CodeRocketService();
  
  // 测试代码片段审查
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
    
    console.log('✅ 代码审查测试成功');
    console.log('状态:', result.status);
    console.log('摘要:', result.summary);
    console.log('AI服务:', result.ai_service_used);
    console.log('时间:', result.timestamp);
    console.log('---\n');
    
  } catch (error) {
    console.error('❌ 代码审查测试失败:', error);
  }
}

async function testServiceStatus() {
  console.log('🔍 测试服务状态功能...\n');
  
  const service = new CodeRocketService();
  
  try {
    const status = await service.getAIServiceStatus();
    
    console.log('✅ 服务状态测试成功');
    console.log('当前服务:', status.current_service);
    console.log('自动切换:', status.auto_switch_enabled);
    console.log('服务状态:');
    
    status.services.forEach(svc => {
      console.log(`  - ${svc.service}: ${svc.available ? '✅' : '❌'} 可用, ${svc.configured ? '✅' : '❌'} 已配置`);
      if (!svc.available && svc.install_command) {
        console.log(`    安装命令: ${svc.install_command}`);
      }
      if (!svc.configured && svc.config_command) {
        console.log(`    配置命令: ${svc.config_command}`);
      }
    });
    
    console.log('---\n');
    
  } catch (error) {
    console.error('❌ 服务状态测试失败:', error);
  }
}

async function testConfiguration() {
  console.log('⚙️ 测试配置功能...\n');
  
  const service = new CodeRocketService();
  
  try {
    const result = await service.configureAIService({
      service: 'gemini',
      scope: 'project',
      timeout: 60,
      max_retries: 2,
    });
    
    console.log('✅ 配置测试成功');
    console.log('结果:', result.message);
    console.log('数据:', JSON.stringify(result.data, null, 2));
    console.log('---\n');
    
  } catch (error) {
    console.error('❌ 配置测试失败:', error);
  }
}

async function runTests() {
  console.log('🚀 CodeRocket MCP 测试开始\n');
  console.log('='.repeat(50));
  
  // 测试服务状态
  await testServiceStatus();
  
  // 测试配置功能
  await testConfiguration();
  
  // 测试代码审查（如果有可用的AI服务）
  await testCodeReview();
  
  console.log('='.repeat(50));
  console.log('🎉 测试完成！');
  
  // 显示日志文件位置
  const logFile = logger.getLogFile();
  if (logFile) {
    console.log(`📝 详细日志: ${logFile}`);
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
