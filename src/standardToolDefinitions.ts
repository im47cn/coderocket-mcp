/**
 * 标准MCP工具定义
 * 符合官方MCP协议规范
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CODEROCKET_TOOLS: Tool[] = [
  {
    name: 'review_code',
    description: '对代码片段进行深度质量分析，提供改进建议、安全漏洞检测、性能优化和最佳实践指导',
    inputSchema: {
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
          enum: ['gemini', 'claude'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'review_changes',
    description: '审查Git工作区的未提交更改，分析代码变更质量、潜在风险和改进建议',
    inputSchema: {
      type: 'object',
      properties: {
        repository_path: {
          type: 'string',
          description: 'Git仓库路径（可选，默认为当前目录）'
        },
        ai_service: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        },
        include_staged: {
          type: 'boolean',
          description: '是否包含已暂存的变更',
          default: true
        },
        include_unstaged: {
          type: 'boolean',
          description: '是否包含未暂存的变更',
          default: true
        }
      },
      required: []
    }
  },
  {
    name: 'review_commit',
    description: '审查Git提交的代码变更和提交消息，评估变更影响、代码质量和提交规范性',
    inputSchema: {
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
          enum: ['gemini', 'claude'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: []
    }
  },
  {
    name: 'review_files',
    description: '批量审查多个文件，提供整体代码质量评估、架构分析和重构建议',
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
        repository_path: {
          type: 'string',
          description: 'Git仓库路径（可选，默认为当前目录）'
        },
        ai_service: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: '指定使用的AI服务（可选）'
        },
        custom_prompt: {
          type: 'string',
          description: '自定义审查提示词（可选）'
        }
      },
      required: ['files']
    }
  },
  {
    name: 'configure_ai_service',
    description: '配置AI服务参数，包括服务选择、API密钥、超时设置和配置范围管理',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['gemini', 'claude'],
          description: '要配置的AI服务（gemini/claude）'
        },
        scope: {
          type: 'string',
          enum: ['project', 'global'],
          description: '配置范围（project: 项目级别, global: 全局级别）',
          default: 'project'
        },
        api_key: {
          type: 'string',
          description: 'API密钥'
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
      required: ['service']
    }
  },
  {
    name: 'get_ai_service_status',
    description: '获取AI服务运行状态，包括服务可用性、配置信息和连接健康状况',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];
