import { z } from 'zod';

// AI服务类型
export const AIServiceSchema = z.enum(['gemini', 'claudecode']);
export type AIService = z.infer<typeof AIServiceSchema>;

// 审查状态
export const ReviewStatusSchema = z.enum(['✅', '⚠️', '❌', '🔍']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;



// 代码审查请求（传统方式，保留向后兼容）
export const ReviewCodeRequestSchema = z.object({
  code: z.string().describe('要审查的代码内容'),
  language: z.string().optional().describe('代码语言（可选，用于更好的分析）'),
  context: z.string().optional().describe('代码上下文信息（可选）'),
  ai_service: AIServiceSchema.optional().describe('指定使用的AI服务（可选）'),
  custom_prompt: z.string().optional().describe('自定义审查提示词（可选）'),
});
export type ReviewCodeRequest = z.infer<typeof ReviewCodeRequestSchema>;

// Git变更审查请求（新的自动化方式）
export const ReviewChangesRequestSchema = z.object({
  repository_path: z
    .string()
    .optional()
    .describe('Git仓库路径（可选，默认为当前目录）'),
  ai_service: AIServiceSchema.optional().describe('指定使用的AI服务（可选）'),
  custom_prompt: z.string().optional().describe('自定义审查提示词（可选）'),
  include_staged: z
    .boolean()
    .optional()
    .default(true)
    .describe('是否包含已暂存的变更'),
  include_unstaged: z
    .boolean()
    .optional()
    .default(true)
    .describe('是否包含未暂存的变更'),
});
export type ReviewChangesRequest = z.infer<typeof ReviewChangesRequestSchema>;

// Git提交审查请求
export const ReviewCommitRequestSchema = z.object({
  commit_hash: z
    .string()
    .optional()
    .describe('提交哈希（可选，默认为最新提交）'),
  repository_path: z
    .string()
    .optional()
    .describe('Git仓库路径（可选，默认为当前目录）'),
  ai_service: AIServiceSchema.optional().describe('指定使用的AI服务（可选）'),
  custom_prompt: z.string().optional().describe('自定义审查提示词（可选）'),
});
export type ReviewCommitRequest = z.infer<typeof ReviewCommitRequestSchema>;

// 文件审查请求
export const ReviewFilesRequestSchema = z.object({
  files: z.array(z.string()).describe('要审查的文件路径列表'),
  repository_path: z
    .string()
    .optional()
    .describe('Git仓库路径（可选，默认为当前目录）'),
  ai_service: AIServiceSchema.optional().describe('指定使用的AI服务（可选）'),
  custom_prompt: z.string().optional().describe('自定义审查提示词（可选）'),
});
export type ReviewFilesRequest = z.infer<typeof ReviewFilesRequestSchema>;



// 审查结果
export const ReviewResultSchema = z.object({
  status: ReviewStatusSchema.describe('审查状态'),
  summary: z.string().describe('审查摘要'),
  details: z.string().describe('详细审查内容'),
  ai_service_used: AIServiceSchema.describe('使用的AI服务'),
  timestamp: z.string().describe('审查时间'),
  report_file: z.string().optional().describe('生成的报告文件路径（如果有）'),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// AI服务状态
export const AIServiceStatusSchema = z.object({
  service: AIServiceSchema.describe('AI服务名称'),
  available: z.boolean().describe('是否可用'),
  configured: z.boolean().describe('是否已配置'),
  install_command: z.string().optional().describe('安装命令（如果未安装）'),
  config_command: z.string().optional().describe('配置命令（如果未配置）'),
  error_message: z.string().optional().describe('错误信息（如果有）'),
});
export type AIServiceStatus = z.infer<typeof AIServiceStatusSchema>;



// 错误响应
export const ErrorResponseSchema = z.object({
  error: z.string().describe('错误信息'),
  error_code: z.string().optional().describe('错误代码'),
  suggestions: z.array(z.string()).optional().describe('解决建议'),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;


