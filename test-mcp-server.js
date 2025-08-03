#!/usr/bin/env node

/**
 * MCP服务器连接测试脚本
 * 用于验证coderocket-mcp服务器是否正常响应
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const DEBUG = true;

function log(message, data) {
  console.log(`[TEST] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(`[TEST] Data:`, JSON.stringify(data, null, 2));
  }
}

function testMCPServer(command, args = []) {
  return new Promise((resolve, reject) => {
    log(`🚀 启动MCP服务器测试`, { command, args });
    
    const server = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        DEBUG: 'true',
        NODE_ENV: 'development'
      }
    });

    let stdout = '';
    let stderr = '';
    let hasResponded = false;

    // 设置超时
    const timeout = setTimeout(() => {
      if (!hasResponded) {
        log('⏰ 服务器启动超时');
        server.kill();
        reject(new Error('服务器启动超时'));
      }
    }, 10000);

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      log('📤 服务器stdout输出', data.toString());
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      log('📤 服务器stderr输出', data.toString());
      
      // 检查是否有调试日志表明服务器启动成功
      if (data.toString().includes('MCP 服务器启动成功')) {
        hasResponded = true;
        clearTimeout(timeout);
        
        // 发送工具列表请求
        log('📋 发送工具列表请求');
        const listToolsRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        };
        
        server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
        
        // 等待响应
        setTimeout(() => {
          server.kill();
          resolve({ stdout, stderr });
        }, 3000);
      }
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      log('❌ 服务器启动错误', error.message);
      reject(error);
    });

    server.on('exit', (code, signal) => {
      clearTimeout(timeout);
      log('🔚 服务器退出', { code, signal });
      if (!hasResponded) {
        reject(new Error(`服务器异常退出: code=${code}, signal=${signal}`));
      }
    });
  });
}

async function runTests() {
  console.log('🧪 开始MCP服务器连接测试\n');
  
  const tests = [
    {
      name: 'test-coderocket-mcp (本地开发版)',
      command: 'node',
      args: [resolve(process.cwd(), 'dist/index.js')]
    },
    {
      name: 'coderocket-mcp (npm全局版)',
      command: 'coderocket-mcp',
      args: []
    },
    {
      name: 'coderocket-mcp (npx版)',
      command: 'npx',
      args: ['-y', '@yeepay/coderocket-mcp@1.4.1']
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔍 测试: ${test.name}`);
      console.log(`📋 命令: ${test.command} ${test.args.join(' ')}`);
      
      const result = await testMCPServer(test.command, test.args);
      
      console.log(`✅ ${test.name} - 测试通过`);
      console.log('📤 输出摘要:');
      console.log('  stdout行数:', result.stdout.split('\n').length);
      console.log('  stderr行数:', result.stderr.split('\n').length);
      
      // 检查是否有工具列表响应
      if (result.stdout.includes('tools') || result.stderr.includes('tools')) {
        console.log('  🎯 检测到工具列表响应');
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - 测试失败: ${error.message}`);
    }
  }
  
  console.log('\n🏁 测试完成');
}

runTests().catch(console.error);
