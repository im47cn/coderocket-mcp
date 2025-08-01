#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CodeRocketService } from './coderocket.js';
import {
  ReviewCodeRequestSchema,
  ReviewChangesRequestSchema,
  ReviewCommitRequestSchema,
  ReviewFilesRequestSchema,
  ConfigureAIServiceRequestSchema,
  GetAIServiceStatusRequestSchema,
} from './types.js';
import { toolDefinitions } from './toolDefinitions.js';

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

    // 延迟初始化 CodeRocketService，等待 ConfigManager 初始化完成
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolDefinitions.map(({ name, description, schema }) => ({
          name,
          description,
          inputSchema: zodToJsonSchema(schema, {
            name: name.replace(/_([a-z])/g, (_, letter) =>
              letter.toUpperCase(),
            ),
            $refStrategy: 'none',
          }),
        })),
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      // 确保 CodeRocketService 已初始化
      if (!this.codeRocketService) {
        throw new Error('CodeRocketService 未初始化，请稍后重试');
      }

      // 辅助函数，用于创建和执行工具调用
      const createToolHandler = async (schema: any, serviceMethod: (args: any) => Promise<any>) => {
        const parsedArgs = schema.parse(args);
        const result = await serviceMethod.call(this.codeRocketService, parsedArgs);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      };

      try {
        switch (name) {
          case 'review_code':
            return await createToolHandler(ReviewCodeRequestSchema, this.codeRocketService.reviewCode);

          case 'review_changes':
            return await createToolHandler(ReviewChangesRequestSchema, this.codeRocketService.reviewChanges);

          case 'review_commit':
            return await createToolHandler(ReviewCommitRequestSchema, this.codeRocketService.reviewCommit);

          case 'review_files':
            return await createToolHandler(ReviewFilesRequestSchema, this.codeRocketService.reviewFiles);

          case 'configure_ai_service':
            return await createToolHandler(ConfigureAIServiceRequestSchema, this.codeRocketService.configureAIService);

          case 'get_ai_service_status':
            return await createToolHandler(GetAIServiceStatusRequestSchema, this.codeRocketService.getAIServiceStatus);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
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
      // 预先初始化配置系统
      const { ConfigManager, CodeRocketService } = await import(
        './coderocket.js'
      );
      await ConfigManager.initialize();

      // 现在可以安全地初始化 CodeRocketService
      this.codeRocketService = new CodeRocketService();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ CodeRocket MCP 服务器启动失败:', errorMessage);
      process.exit(1);
    }
  }
}

// 启动服务器
const server = new CodeRocketMCPServer();
server.run().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
