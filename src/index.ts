#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CodeRocketService, initializeCodeRocket } from './coderocket.js';
import { CODEROCKET_TOOLS } from './standardToolDefinitions.js';

// 调试模式检测
const DEBUG_MODE = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  console.error(`[CODEROCKET-MCP-DEBUG] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.error(`[CODEROCKET-MCP-DEBUG] Data:`, JSON.stringify(data, null, 2));
  }
}

// 读取版本号
const getVersion = async (): Promise<string> => {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    console.error('Failed to read version from package.json:', error);
    return 'unknown';
  }
};

const VERSION = await getVersion();

/**
 * CodeRocket MCP Server
 *
 * 提供AI驱动的代码审查功能，集成多种AI服务（Gemini、ClaudeCode）
 * 支持代码片段审查、Git提交审查、文件审查和AI服务管理
 */
class CodeRocketMCPServer {
  private server: Server;
  private codeRocketService: CodeRocketService | null = null;

  constructor() {
    debugLog('🚀 CodeRocket MCP Server 构造函数开始', { version: VERSION });

    this.server = new Server(
      {
        name: 'coderocket-mcp',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    debugLog('✅ MCP Server 实例创建完成');

    // 延迟初始化 CodeRocketService，等待 ConfigManager 初始化完成
    this.setupToolHandlers();

    debugLog('✅ 工具处理器设置完成');
  }

  private setupToolHandlers() {
    debugLog('🔧 开始设置工具处理器');

    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      debugLog('📋 收到工具列表请求');

      debugLog('📋 返回工具列表', {
        toolCount: CODEROCKET_TOOLS.length,
        toolNames: CODEROCKET_TOOLS.map(t => t.name)
      });

      return { tools: CODEROCKET_TOOLS };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      debugLog('🔧 收到工具调用请求', { toolName: name, args });

      // 确保 CodeRocketService 已初始化
      if (!this.codeRocketService) {
        debugLog('❌ CodeRocketService 未初始化');
        throw new Error('CodeRocketService 未初始化，请稍后重试');
      }

      try {
        let result: any;
        const safeArgs = args || {};

        switch (name) {
          case 'review_code':
            result = await this.codeRocketService.reviewCode(safeArgs as any);
            break;

          case 'review_changes':
            result = await this.codeRocketService.reviewChanges(safeArgs as any);
            break;

          case 'review_commit':
            result = await this.codeRocketService.reviewCommit(safeArgs as any);
            break;

          case 'review_files':
            result = await this.codeRocketService.reviewFiles(safeArgs as any);
            break;

          case 'configure_ai_service':
            result = await this.codeRocketService.configureAIService(safeArgs as any);
            break;

          case 'get_ai_service_status':
            result = await this.codeRocketService.getAIServiceStatus(safeArgs as any);
            break;

          default:
            throw new Error(`未知工具: ${name}`);
        }

        debugLog('✅ 工具调用成功', { toolName: name, resultType: typeof result });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        debugLog('❌ 工具调用失败', { toolName: name, error: errorMessage });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: errorMessage,
                  error_code: 'TOOL_EXECUTION_ERROR',
                  suggestions: [
                    '检查输入参数是否正确',
                    '验证AI服务配置是否正确',
                    '确保API密钥已正确设置',
                    '检查网络连接是否正常',
                  ],
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    try {
      debugLog('🚀 开始启动 CodeRocket MCP 服务器');

      // 使用新的初始化函数初始化所有系统组件
      debugLog('🔧 开始初始化系统组件');
      await initializeCodeRocket();
      debugLog('✅ 系统组件初始化完成');

      // 现在可以安全地初始化 CodeRocketService
      debugLog('🔧 开始初始化 CodeRocketService');
      this.codeRocketService = new CodeRocketService();
      debugLog('✅ CodeRocketService 初始化完成');

      debugLog('🔧 开始连接 MCP 传输层');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      debugLog('✅ MCP 服务器启动成功，等待客户端连接');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLog('❌ 服务器启动失败', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      console.error('❌ CodeRocket MCP 服务器启动失败:', errorMessage);
      process.exit(1);
    }
  }
}

// 启动服务器
debugLog('🌟 开始创建 CodeRocket MCP 服务器实例');
const server = new CodeRocketMCPServer();
debugLog('🌟 服务器实例创建完成，开始运行');

server.run().catch(error => {
  debugLog('💥 服务器运行失败', { error: error.message, stack: error.stack });
  console.error('Failed to start server:', error);
  process.exit(1);
});
