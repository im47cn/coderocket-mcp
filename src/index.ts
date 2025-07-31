#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CodeRocketService } from './coderocket.js';
import {
  ReviewCodeRequestSchema,
  ReviewCommitRequestSchema,
  ReviewFilesRequestSchema,
  ConfigureAIServiceRequestSchema,
} from './types.js';

/**
 * CodeRocket MCP Server
 * 
 * 提供AI驱动的代码审查功能，集成多种AI服务（Gemini、OpenCode、ClaudeCode）
 * 支持代码片段审查、Git提交审查、文件审查和AI服务管理
 */
class CodeRocketMCPServer {
  private server: Server;
  private codeRocketService: CodeRocketService;

  constructor() {
    this.server = new Server(
      {
        name: 'coderocket-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.codeRocketService = new CodeRocketService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'review_code',
            description: '审查代码片段，提供详细的质量分析和改进建议',
            inputSchema: ReviewCodeRequestSchema,
          },
          {
            name: 'review_commit',
            description: '审查Git提交，分析代码变更的质量和影响',
            inputSchema: ReviewCommitRequestSchema,
          },
          {
            name: 'review_files',
            description: '审查指定文件列表，提供全面的代码质量评估',
            inputSchema: ReviewFilesRequestSchema,
          },
          {
            name: 'configure_ai_service',
            description: '配置AI服务设置，包括服务选择、API密钥等',
            inputSchema: ConfigureAIServiceRequestSchema,
          },
          {
            name: 'get_ai_service_status',
            description: '获取所有AI服务的状态信息，包括可用性和配置状态',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

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

          case 'review_commit': {
            const parsedArgs = ReviewCommitRequestSchema.parse(args);
            const result = await this.codeRocketService.reviewCommit(parsedArgs);
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

          case 'configure_ai_service': {
            const parsedArgs = ConfigureAIServiceRequestSchema.parse(args);
            const result = await this.codeRocketService.configureAIService(parsedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_ai_service_status': {
            const result = await this.codeRocketService.getAIServiceStatus();
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: errorMessage,
                error_code: 'TOOL_EXECUTION_ERROR',
                suggestions: [
                  '检查输入参数是否正确',
                  '确保coderocket-cli已正确安装',
                  '验证AI服务配置是否正确',
                ],
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CodeRocket MCP Server running on stdio');
  }
}

// 启动服务器
const server = new CodeRocketMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
