/**
 * 标准MCP工具定义
 * 符合官方MCP协议规范
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CODEROCKET_TOOLS: Tool[] = [
  {
    name: 'review_code',
    description: '对指定的代码片段进行AI驱动的代码审查，提供改进建议、潜在问题识别和最佳实践推荐',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要审查的代码内容'
        },
        language: {
          type: 'string',
          description: '代码语言（如：javascript, python, typescript等）',
          default: 'auto'
        },
        focus: {
          type: 'string',
          description: '审查重点（如：performance, security, readability等）',
          default: 'general'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'review_changes',
    description: '审查Git工作区中的未提交更改，分析修改内容并提供改进建议',
    inputSchema: {
      type: 'object',
      properties: {
        staged_only: {
          type: 'boolean',
          description: '是否只审查已暂存的更改',
          default: false
        },
        include_context: {
          type: 'boolean',
          description: '是否包含更改上下文',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'review_commit',
    description: '审查指定的Git提交，分析提交内容、消息质量和代码更改',
    inputSchema: {
      type: 'object',
      properties: {
        commit_hash: {
          type: 'string',
          description: 'Git提交哈希值（可选，默认为最新提交）'
        },
        include_diff: {
          type: 'boolean',
          description: '是否包含详细的差异信息',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'review_files',
    description: '审查指定的文件列表，提供代码质量分析和改进建议',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '要审查的文件路径列表'
        },
        recursive: {
          type: 'boolean',
          description: '如果指定目录，是否递归审查子目录',
          default: false
        }
      },
      required: ['files']
    }
  },
  {
    name: 'configure_ai_service',
    description: '配置AI服务设置，包括服务提供商、模型选择和API密钥等',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: 'AI服务提供商'
        },
        api_key: {
          type: 'string',
          description: 'API密钥'
        },
        model: {
          type: 'string',
          description: '模型名称（可选）'
        },
        timeout: {
          type: 'number',
          description: '请求超时时间（秒）',
          default: 30
        }
      },
      required: ['service', 'api_key']
    }
  },
  {
    name: 'get_ai_service_status',
    description: '获取当前AI服务的状态信息，包括配置详情和连接状态',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
