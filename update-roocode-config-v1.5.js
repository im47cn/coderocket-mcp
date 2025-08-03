#!/usr/bin/env node

/**
 * 更新RooCode配置使用标准MCP实现v1.5.0
 */

import { readFileSync, writeFileSync } from 'fs';

const configPath = "/Users/dreambt/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json";

function updateConfig() {
  try {
    console.log('🔧 更新RooCode配置使用标准MCP实现v1.5.0...');
    
    // 读取配置
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // 更新test-coderocket-mcp配置
    if (config.mcpServers['test-coderocket-mcp']) {
      config.mcpServers['test-coderocket-mcp'] = {
        command: 'node',
        args: ['/Users/dreambt/sources/coderocket/coderocket-mcp/dist/index.js'],
        disabled: false,
        alwaysAllow: [
          'review_code',
          'review_changes',
          'review_commit',
          'review_files',
          'configure_ai_service',
          'get_ai_service_status'
        ]
      };
      console.log('✅ 更新 test-coderocket-mcp 配置 (标准MCP实现v1.5.0)');
    }
    
    // 确保其他配置仍然禁用
    if (config.mcpServers['coderocket-mcp']) {
      config.mcpServers['coderocket-mcp'].disabled = true;
      console.log('❌ 保持 coderocket-mcp 禁用状态');
    }
    
    if (config.mcpServers['global-coderocket-mcp']) {
      config.mcpServers['global-coderocket-mcp'].disabled = true;
      console.log('❌ 保持 global-coderocket-mcp 禁用状态');
    }
    
    // 写回配置
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('\n✅ 配置更新完成！');
    console.log('\n📋 标准MCP实现特性:');
    console.log('  ✅ 符合官方MCP协议规范');
    console.log('  ✅ 使用标准Tool类型定义');
    console.log('  ✅ 直接使用JSON Schema而非Zod转换');
    console.log('  ✅ 简化的错误处理机制');
    console.log('  ✅ 完整的调试日志系统');
    
    console.log('\n📊 工具列表:');
    console.log('  🔍 review_code - 代码片段审查');
    console.log('  🚀 review_changes - Git更改审查');
    console.log('  📝 review_commit - Git提交审查');
    console.log('  📁 review_files - 文件列表审查');
    console.log('  ⚙️ configure_ai_service - AI服务配置');
    console.log('  📊 get_ai_service_status - AI服务状态');
    
    console.log('\n🔄 请重启RooCode以使用标准MCP实现');
    console.log('\n💡 如果工具现在可见，说明问题已解决！');
    
  } catch (error) {
    console.error('❌ 更新配置失败:', error.message);
  }
}

updateConfig();
