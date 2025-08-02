import { ConfigManager } from './dist/config/ConfigManager.js';
import assert from 'assert';

async function testConfigManager() {
  console.log('🧪 ConfigManager 核心功能测试...');
  
  try {
    // 清理可能影响测试的环境变量
    delete process.env.AI_SERVICE;
    delete process.env.AI_TIMEOUT;
    delete process.env.AI_AUTO_SWITCH;

    // 重置 ConfigManager 状态
    ConfigManager.initialized = false;
    ConfigManager.config = {};

    // 测试初始化
    await ConfigManager.initialize();
    assert(
      ConfigManager.initialized === true,
      'ConfigManager 应该已初始化',
    );

    // 测试配置加载（包括.env文件）
    const service = ConfigManager.get('AI_SERVICE');
    console.log('AI_SERVICE:', service);
    assert(
      service === 'gemini',
      'AI 服务应该是 gemini',
    );
    
    const autoSwitch = ConfigManager.get('AI_AUTO_SWITCH');
    console.log('AI_AUTO_SWITCH:', autoSwitch);
    assert(
      autoSwitch === 'true',
      '应该启用自动切换',
    );
    
    const timeoutStr = ConfigManager.get('AI_TIMEOUT');
    console.log('AI_TIMEOUT:', timeoutStr);
    assert(timeoutStr === '30', '超时应该是 30 秒');

    // 测试配置获取
    const timeout = ConfigManager.getTimeout();
    console.log('getTimeout():', timeout);
    assert(typeof timeout === 'number', '超时应该是数字');
    assert(timeout > 0, '超时应该大于 0');
    assert(timeout === 30, '超时应该是 30');

    console.log('✅ ConfigManager 核心功能测试 - 通过');
  } catch (error) {
    console.log('❌ ConfigManager 核心功能测试 - 失败:', error.message);
  }
}

testConfigManager();
