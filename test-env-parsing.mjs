#!/usr/bin/env node

// 验证 .env 解析逻辑重构
import { ConfigManager } from './dist/coderocket.js';

async function testEnvParsingRefactor() {
  console.log('🧪 测试 .env 解析逻辑重构...');
  
  // 创建一个测试 .env 文件内容
  const testEnvContent = `# 测试配置文件
AI_SERVICE=gemini
GEMINI_API_KEY=test-key-123
CLAUDE_API_KEY=test-claude-key
AI_TIMEOUT=30
# 注释行
QUOTED_VALUE="quoted string"
SINGLE_QUOTED='single quoted'
COMPLEX_VALUE=value=with=equals
`;

  try {
    // 测试 parseEnvContent 方法
    const parsed = ConfigManager.parseEnvContent(testEnvContent);
    
    console.log('解析结果:', parsed);
    
    // 验证解析结果
    const expectedKeys = ['AI_SERVICE', 'GEMINI_API_KEY', 'CLAUDE_API_KEY', 'AI_TIMEOUT', 'QUOTED_VALUE', 'SINGLE_QUOTED', 'COMPLEX_VALUE'];
    let allPassed = true;
    
    for (const key of expectedKeys) {
      if (!(key in parsed)) {
        console.log(`❌ 缺少键: ${key}`);
        allPassed = false;
      }
    }
    
    // 检查引号处理
    if (parsed.QUOTED_VALUE === 'quoted string') {
      console.log('✅ 双引号处理正确');
    } else {
      console.log(`❌ 双引号处理错误: ${parsed.QUOTED_VALUE}`);
      allPassed = false;
    }
    
    if (parsed.SINGLE_QUOTED === 'single quoted') {
      console.log('✅ 单引号处理正确');
    } else {
      console.log(`❌ 单引号处理错误: ${parsed.SINGLE_QUOTED}`);
      allPassed = false;
    }
    
    // 检查等号处理
    if (parsed.COMPLEX_VALUE === 'value=with=equals') {
      console.log('✅ 复杂值处理正确');
    } else {
      console.log(`❌ 复杂值处理错误: ${parsed.COMPLEX_VALUE}`);
      allPassed = false;
    }
    
    if (allPassed) {
      console.log('✅ .env 解析逻辑重构成功，功能正常');
    } else {
      console.log('❌ .env 解析功能存在问题');
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}

testEnvParsingRefactor().catch(console.error);
