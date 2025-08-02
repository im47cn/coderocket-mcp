import { ConfigManager } from './dist/config/ConfigManager.js';

async function debug() {
  console.log('开始调试ConfigManager...');
  
  try {
    await ConfigManager.initialize();
    console.log('ConfigManager初始化成功');
    
    const timeout = ConfigManager.get('AI_TIMEOUT');
    console.log('AI_TIMEOUT值:', timeout, '类型:', typeof timeout);
    console.log('AI_TIMEOUT === "30":', timeout === '30');

    const service = ConfigManager.get('AI_SERVICE');
    console.log('AI_SERVICE值:', service, '类型:', typeof service);
    console.log('AI_SERVICE === "gemini":', service === 'gemini');

    const autoSwitch = ConfigManager.get('AI_AUTO_SWITCH');
    console.log('AI_AUTO_SWITCH值:', autoSwitch, '类型:', typeof autoSwitch);
    console.log('AI_AUTO_SWITCH === "true":', autoSwitch === 'true');

    // 测试getTimeout方法
    const timeoutNumber = ConfigManager.getTimeout();
    console.log('getTimeout()返回值:', timeoutNumber, '类型:', typeof timeoutNumber);
    console.log('timeoutNumber === 30:', timeoutNumber === 30);
    console.log('timeoutNumber > 0:', timeoutNumber > 0);
    
  } catch (error) {
    console.error('调试失败:', error.message);
  }
}

debug();
