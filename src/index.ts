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
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 手动创建 JSON Schema（更可靠的方法）
 */
function createJsonSchemas() {
  return {
    reviewCode: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要审查的代码内容'
        },
        language: {
          type: 'string',
          description: '代码语言（可选，用于更好的分析）'
        },
        context: {
          type: 'string',
          description: '代码上下文信息（可选）'
        },
        ai_service: {
          type: 'string',
          enum: ['gemini', 'claudecode'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: ['code'],
      additionalProperties: false
    },
    reviewCommit: {
      type: 'object',
      properties: {
        commit_hash: {
          type: 'string',
          description: '提交哈希（可选，默认为最新提交）'
        },
        repository_path: {
          type: 'string',
          description: 'Git仓库路径（可选，默认为当前目录）'
        },
        ai_service: {
          type: 'string',
          enum: ['gemini', 'claudecode'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: [],
      additionalProperties: false
    },
    reviewFiles: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: '要审查的文件路径列表'
        },
        repository_path: {
          type: 'string',
          description: 'Git仓库路径（可选，默认为当前目录）'
        },
        ai_service: {
          type: 'string',
          enum: ['gemini', 'claudecode'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: ['files'],
      additionalProperties: false
    },
    configureAIService: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['gemini', 'claudecode'],
          description: '要配置的AI服务'
        },
        scope: {
          type: 'string',
          enum: ['project', 'global'],
          description: '配置范围',
          default: 'project'
        },
        api_key: {
          type: 'string',
          description: 'API密钥（可选）'
        },
        timeout: {
          type: 'number',
          description: '超时时间（秒）'
        },
        max_retries: {
          type: 'number',
          description: '最大重试次数'
        }
      },
      required: ['service'],
      additionalProperties: false
    }
  };
}

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
    // 读取实际版本号
    let version = '1.1.1'; // 默认版本
    try {
      const packagePath = resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      version = packageJson.version;
    } catch (error) {
      console.error('⚠️ 无法读取版本信息，使用默认版本:', version);
    }

    this.server = new Server(
      {
        name: 'coderocket-mcp',
        version: version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.codeRocketService = new CodeRocketService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const schemas = createJsonSchemas();
      return {
        tools: [
          {
            name: 'review_code',
            description: `🔍 代码片段智能审查工具

**功能**: 对提供的代码片段进行深度质量分析，提供专业的改进建议和最佳实践指导。

**适用场景**:
- 代码重构前的质量评估
- 新功能开发的代码审查
- 学习和改进编程技能
- 代码规范性检查

**AI分析维度**:
- 代码逻辑和算法效率
- 安全漏洞和潜在风险
- 可读性和维护性
- 性能优化建议
- 最佳实践合规性

**输出格式**: 结构化的审查报告，包含状态评级、摘要和详细分析`,
            inputSchema: schemas.reviewCode,
          },
          {
            name: 'review_commit',
            description: `📝 Git提交智能审查工具

**功能**: 分析Git提交的代码变更，评估变更的质量、影响范围和潜在风险。

**适用场景**:
- 代码合并前的质量把关
- 提交历史的质量回顾
- 团队代码审查流程
- 持续集成质量检查

**AI分析维度**:
- 变更逻辑的合理性
- 代码风格一致性
- 潜在的破坏性变更
- 测试覆盖率影响
- 文档更新需求

**输出格式**: 详细的提交审查报告，包含变更摘要和风险评估`,
            inputSchema: schemas.reviewCommit,
          },
          {
            name: 'review_files',
            description: `📁 多文件批量审查工具

**功能**: 对指定的多个文件进行批量代码质量审查，提供整体项目质量评估。

**适用场景**:
- 项目整体质量评估
- 重构前的现状分析
- 新团队成员代码熟悉
- 技术债务识别

**AI分析维度**:
- 文件间依赖关系分析
- 架构设计合理性
- 代码重复度检测
- 模块化程度评估
- 整体代码健康度

**输出格式**: 综合性的多文件审查报告，包含文件级和项目级分析`,
            inputSchema: schemas.reviewFiles,
          },
          {
            name: 'configure_ai_service',
            description: `⚙️ AI服务配置管理工具

**功能**: 配置和管理CodeRocket使用的AI服务，包括API密钥设置、服务选择和参数调优。

**支持的AI服务**:
- **Gemini**: Google的先进AI模型，擅长代码分析和建议
- **ClaudeCode**: Anthropic的专业代码审查模型

**配置选项**:
- API密钥管理（项目级/全局级）
- 服务优先级设置
- 超时和重试参数
- 自动故障转移配置

**安全性**: API密钥加密存储，支持环境变量配置

**输出格式**: 配置操作结果和当前配置状态`,
            inputSchema: schemas.configureAIService,
          },
          {
            name: 'get_ai_service_status',
            description: `📊 AI服务状态监控工具

**功能**: 获取所有已配置AI服务的实时状态信息，包括可用性、配置状态和性能指标。

**监控信息**:
- 服务连接状态
- API配额使用情况
- 响应时间统计
- 错误率监控
- 配置完整性检查

**故障诊断**:
- 自动检测配置问题
- 提供修复建议
- 显示详细错误信息

**输出格式**: 完整的服务状态报告，包含所有服务的健康状况`,
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
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

          case 'configure_ai_service': {
            const parsedArgs = ConfigureAIServiceRequestSchema.parse(args);
            const result =
              await this.codeRocketService.configureAIService(parsedArgs);
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
      const { ConfigManager } = await import('./coderocket.js');
      await ConfigManager.initialize();
      console.error('✅ CodeRocket MCP 配置系统初始化完成');

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('🚀 CodeRocket MCP Server running on stdio');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ CodeRocket MCP 服务器启动失败:', errorMessage);
      if (process.env.DEBUG === 'true') {
        console.error('🔍 详细错误信息:', error);
      }
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
