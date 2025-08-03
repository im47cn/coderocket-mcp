#!/usr/bin/env node

/**
 * 修复RooCode MCP配置
 * 禁用有问题的配置，只保留工作正常的配置
 */

import { readFileSync, writeFileSync } from 'fs';

const configPath = "/Users/dreambt/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json";

function fixConfig() {
  try {
    console.log('🔧 修复RooCode MCP配置...');
    
    // 读取配置
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // 禁用有问题的配置
    if (config.mcpServers['coderocket-mcp']) {
      config.mcpServers['coderocket-mcp'].disabled = true;
      console.log('❌ 禁用 coderocket-mcp (npx版本启动超时)');
    }
    
    if (config.mcpServers['global-coderocket-mcp']) {
      config.mcpServers['global-coderocket-mcp'].disabled = true;
      console.log('❌ 禁用 global-coderocket-mcp (命令不存在)');
    }
    
    // 确保test-coderocket-mcp启用
    if (config.mcpServers['test-coderocket-mcp']) {
      config.mcpServers['test-coderocket-mcp'].disabled = false;
      console.log('✅ 启用 test-coderocket-mcp (本地开发版本)');
    }
    
    // 写回配置
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('\n✅ 配置修复完成！');
    console.log('\n📋 当前活跃配置:');
    console.log('  - test-coderocket-mcp: 本地开发版本');
    console.log('    命令: node /Users/dreambt/sources/coderocket/coderocket-mcp/dist/index.js');
    console.log('    工具: 6个 (review_code, review_changes, review_commit, review_files, configure_ai_service, get_ai_service_status)');
    
    console.log('\n🔄 请重启RooCode以使配置生效');
    console.log('\n💡 如果问题仍然存在，请检查:');
    console.log('  1. RooCode是否正确加载MCP配置');
    console.log('  2. 是否有其他MCP服务器冲突');
    console.log('  3. RooCode的MCP功能是否启用');
    
  } catch (error) {
    console.error('❌ 修复配置失败:', error.message);
  }
}

fixConfig();
