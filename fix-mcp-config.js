#!/usr/bin/env node

/**
 * 修复MCP配置文件，添加coderocket-mcp工具的alwaysAllow列表
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const configPath = "/Users/dreambt/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json";

// coderocket-mcp提供的所有工具
const coderocketTools = [
  "review_code",
  "review_changes", 
  "review_commit",
  "review_files",
  "configure_ai_service",
  "get_ai_service_status"
];

try {
  console.log('🔧 正在修复MCP配置...');
  
  // 读取现有配置
  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  
  // 更新coderocket-mcp相关的配置
  const serversToUpdate = ['coderocket-mcp', 'global-coderocket-mcp', 'test-coderocket-mcp'];
  
  let updated = false;
  
  for (const serverName of serversToUpdate) {
    if (config.mcpServers[serverName]) {
      console.log(`📝 更新 ${serverName} 配置...`);
      config.mcpServers[serverName].alwaysAllow = coderocketTools;
      updated = true;
    }
  }
  
  if (updated) {
    // 写回配置文件
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ MCP配置修复完成！');
    console.log('');
    console.log('📋 已添加的工具:');
    coderocketTools.forEach(tool => {
      console.log(`  - ${tool}`);
    });
    console.log('');
    console.log('🔄 请重启RooCode以使配置生效');
  } else {
    console.log('⚠️ 未找到需要更新的coderocket-mcp配置');
  }
  
} catch (error) {
  console.error('❌ 修复配置失败:', error.message);
  process.exit(1);
}
