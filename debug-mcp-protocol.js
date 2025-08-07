#!/usr/bin/env node

/**
 * MCP协议调试脚本
 * 模拟RooCode客户端与coderocket-mcp服务器的完整交互
 */

import { spawn } from 'child_process';

function testMCPProtocol(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 启动MCP服务器: ${command} ${args.join(' ')}`);
    
    const server = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        DEBUG: 'true',
        NODE_ENV: 'development'
      }
    });

    let responses = [];
    let buffer = '';

    // 设置超时
    const timeout = setTimeout(() => {
      console.log('⏰ 测试超时');
      server.kill();
      resolve(responses);
    }, 15000);

    server.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // 尝试解析JSON响应
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            console.log('📨 收到响应:', JSON.stringify(response, null, 2));
            responses.push(response);
          } catch (e) {
            console.log('📤 非JSON输出:', line);
          }
        }
      }
    });

    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP 服务器启动成功')) {
        console.log('✅ 服务器启动成功，开始协议测试');
        
        // 1. 发送初始化请求
        setTimeout(() => {
          console.log('\n🔧 发送初始化请求');
          const initRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {
                roots: {
                  listChanged: true
                },
                sampling: {}
              },
              clientInfo: {
                name: 'test-client',
                version: '1.0.0'
              }
            }
          };
          server.stdin.write(JSON.stringify(initRequest) + '\n');
        }, 500);
        
        // 2. 发送工具列表请求
        setTimeout(() => {
          console.log('\n📋 发送工具列表请求');
          const listToolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
          };
          server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
        }, 1000);
        
        // 3. 发送工具调用请求
        setTimeout(() => {
          console.log('\n🔧 发送工具调用请求');
          const callToolRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'get_ai_service_status',
              arguments: {}
            }
          };
          server.stdin.write(JSON.stringify(callToolRequest) + '\n');
        }, 1500);
        
        // 4. 结束测试
        setTimeout(() => {
          clearTimeout(timeout);
          server.kill();
          resolve(responses);
        }, 3000);
      }
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ 服务器错误:', error.message);
      reject(error);
    });

    server.on('exit', (code, signal) => {
      clearTimeout(timeout);
      console.log(`🔚 服务器退出: code=${code}, signal=${signal}`);
    });
  });
}

async function runProtocolTest() {
  console.log('🧪 开始MCP协议调试测试\n');
  
  try {
    const responses = await testMCPProtocol('node', ['dist/index.js']);
    
    console.log('\n📊 测试结果分析:');
    console.log(`总响应数: ${responses.length}`);
    
    const initResponse = responses.find(r => r.id === 1);
    const toolsResponse = responses.find(r => r.id === 2);
    const callResponse = responses.find(r => r.id === 3);
    
    if (initResponse) {
      console.log('✅ 初始化响应: 正常');
      console.log('  服务器信息:', initResponse.result?.serverInfo);
    } else {
      console.log('❌ 初始化响应: 缺失');
    }
    
    if (toolsResponse) {
      console.log('✅ 工具列表响应: 正常');
      console.log('  工具数量:', toolsResponse.result?.tools?.length || 0);
      if (toolsResponse.result?.tools) {
        console.log('  工具名称:', toolsResponse.result.tools.map(t => t.name));
      }
    } else {
      console.log('❌ 工具列表响应: 缺失');
    }
    
    if (callResponse) {
      console.log('✅ 工具调用响应: 正常');
    } else {
      console.log('❌ 工具调用响应: 缺失');
    }
    
    console.log('\n🎯 诊断建议:');
    if (responses.length === 0) {
      console.log('- 服务器可能没有正确响应JSON-RPC请求');
      console.log('- 检查MCP协议实现是否正确');
    } else if (!toolsResponse || !toolsResponse.result?.tools?.length) {
      console.log('- 工具列表为空或响应格式错误');
      console.log('- 检查toolDefinitions和工具注册逻辑');
    } else {
      console.log('- MCP协议工作正常');
      console.log('- 问题可能在RooCode客户端配置或连接');
    }
    
  } catch (error) {
    console.error('❌ 协议测试失败:', error.message);
  }
}

runProtocolTest().catch(console.error);
