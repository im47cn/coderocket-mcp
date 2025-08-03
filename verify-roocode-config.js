#!/usr/bin/env node

/**
 * RooCode MCP配置验证脚本
 * 验证所有coderocket-mcp配置是否能正常启动
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const configPath = "/Users/dreambt/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json";

function testCommand(name, command, args) {
  return new Promise((resolve) => {
    console.log(`\n🧪 测试配置: ${name}`);
    console.log(`📋 命令: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DEBUG: 'true' }
    });
    
    let hasOutput = false;
    let errorOutput = '';
    
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        name,
        success: hasOutput,
        error: hasOutput ? null : '启动超时'
      });
    }, 5000);
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      
      if (output.includes('MCP 服务器启动成功') || output.includes('✅ MCP Server')) {
        hasOutput = true;
        clearTimeout(timeout);
        child.kill();
        resolve({
          name,
          success: true,
          error: null
        });
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        name,
        success: false,
        error: error.message
      });
    });
    
    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!hasOutput) {
        resolve({
          name,
          success: false,
          error: `进程退出 (code: ${code})`
        });
      }
    });
  });
}

async function verifyConfig() {
  console.log('🔍 验证RooCode MCP配置\n');
  
  try {
    // 读取配置文件
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const coderocketConfigs = Object.entries(config.mcpServers)
      .filter(([name]) => name.includes('coderocket'));
    
    console.log(`📋 找到 ${coderocketConfigs.length} 个coderocket-mcp配置:`);
    coderocketConfigs.forEach(([name, cfg]) => {
      console.log(`  - ${name}: ${cfg.command} ${cfg.args?.join(' ') || ''} (disabled: ${cfg.disabled})`);
    });
    
    // 测试每个配置
    const results = [];
    for (const [name, cfg] of coderocketConfigs) {
      if (cfg.disabled) {
        console.log(`\n⏭️  跳过已禁用的配置: ${name}`);
        continue;
      }
      
      const result = await testCommand(name, cfg.command, cfg.args || []);
      results.push(result);
    }
    
    // 输出结果
    console.log('\n📊 验证结果:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.name}: 正常`);
      } else {
        console.log(`❌ ${result.name}: ${result.error}`);
      }
    });
    
    // 建议
    console.log('\n💡 建议:');
    const workingConfigs = results.filter(r => r.success);
    const failedConfigs = results.filter(r => !r.success);
    
    if (workingConfigs.length > 0) {
      console.log(`✅ 有 ${workingConfigs.length} 个配置正常工作:`);
      workingConfigs.forEach(r => console.log(`  - ${r.name}`));
      console.log('\n🔧 建议操作:');
      console.log('1. 禁用失败的配置');
      console.log('2. 只保留一个工作正常的配置');
      console.log('3. 重启RooCode');
    }
    
    if (failedConfigs.length > 0) {
      console.log(`\n❌ 有 ${failedConfigs.length} 个配置失败:`);
      failedConfigs.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    // 生成修复脚本
    if (failedConfigs.length > 0) {
      console.log('\n🔧 生成配置修复建议...');
      
      // 找到最佳配置
      const bestConfig = workingConfigs[0];
      if (bestConfig) {
        console.log(`\n推荐使用配置: ${bestConfig.name}`);
        console.log('可以禁用其他配置以避免冲突');
      }
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyConfig().catch(console.error);
