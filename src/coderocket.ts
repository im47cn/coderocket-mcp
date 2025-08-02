// 重构后的 coderocket.ts - 现在只导出主要类和初始化函数
// 保持向后兼容性

// 导出新的模块化组件
export { ConfigManager } from './config/ConfigManager.js';
export { PromptManager } from './prompts/PromptManager.js';
export { SmartAIManager } from './ai/SmartAIManager.js';
export { CodeRocketService } from './services/CodeRocketService.js';

// 导入用于初始化
import { ConfigManager as ConfigMgr } from './config/ConfigManager.js';
import { PromptManager as PromptMgr } from './prompts/PromptManager.js';

/**
 * 初始化所有系统组件
 *
 * 这个函数确保所有必要的系统组件都被正确初始化
 * 保持向后兼容性
 */
export async function initializeCodeRocket(): Promise<void> {
  // 初始化配置管理器
  await ConfigMgr.initialize();

  // 初始化提示词管理器
  await PromptMgr.initialize();
}