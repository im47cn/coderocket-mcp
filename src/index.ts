#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CodeRocketService } from './coderocket.js';
import {
  ReviewCodeRequestSchema,
  ReviewChangesRequestSchema,
  ReviewCommitRequestSchema,
  ReviewFilesRequestSchema,
} from './types.js';
import { toolDefinitions } from './toolDefinitions.js';




/**
 * CodeRocket MCP Server
 *
 * 提供AI驱动的代码审查功能，集成多种AI服务（Gemini、OpenCode、ClaudeCode）
 * 支持代码片段审查、Git提交审查、文件审查和AI服务管理
 */
class CodeRocketMCPServer {
  private server: Server;
  private codeRocketService: CodeRocketService | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'coderocket-mcp',
        version: '1.3.2',
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

      try {
        switch (name) {
          case 'review_code': {
            const parsedArgs = ReviewCodeRequestSchema.parse(args);
            const result = await this.codeRocketService.reviewCode(parsedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'review_changes': {
            const parsedArgs = ReviewChangesRequestSchema.parse(args);
            const result =
              await this.codeRocketService.reviewChanges(parsedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'review_commit': {
            const parsedArgs = ReviewCommitRequestSchema.parse(args);
            const result =
              await this.codeRocketService.reviewCommit(parsedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'review_files': {
            const parsedArgs = ReviewFilesRequestSchema.parse(args);
            const result = await this.codeRocketService.reviewFiles(parsedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

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
