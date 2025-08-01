import { z } from 'zod';

// AI服务类型
export const AIServiceSchema = z.enum(['gemini', 'claudecode']);
export type AIService = z.infer<typeof AIServiceSchema>;

// 审查状态
export const ReviewStatusSchema = z.enum(['✅', '⚠️', '❌', '🔍']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

// 配置范围
export const ConfigScopeSchema = z.enum(['project', 'global']);
export type ConfigScope = z.infer<typeof ConfigScopeSchema>;

// 代码审查请求
export const ReviewCodeRequestSchema = z.object({
  code: z.string().describe('要审查的代码内容'),
  language: z.string().optional().describe('代码语言（可选，用于更好的分析）'),
  context: z.string().optional().describe('代码上下文信息（可选）'),
  ai_service: AIServiceSchema.optional().describe('指定使用的AI服务（可选）'),
  custom_prompt: z.string().optional().describe('自定义审查提示词（可选）'),
});
export type ReviewCodeRequest = z.infer<typeof ReviewCodeRequestSchema>;

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

// AI服务配置请求
export const ConfigureAIServiceRequestSchema = z.object({
  service: AIServiceSchema.describe('要配置的AI服务'),
  scope: ConfigScopeSchema.optional().default('project').describe('配置范围'),
  api_key: z.string().optional().describe('API密钥（可选）'),
  language: z.string().optional().describe('AI服务语言设置（如：zh-CN, en-US）'),
  timeout: z.number().optional().describe('超时时间（秒）'),
  max_retries: z.number().optional().describe('最大重试次数'),
});
export type ConfigureAIServiceRequest = z.infer<
  typeof ConfigureAIServiceRequestSchema
>;

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

// 服务状态响应
export const ServiceStatusResponseSchema = z.object({
  current_service: AIServiceSchema.describe('当前使用的AI服务'),
  services: z.array(AIServiceStatusSchema).describe('所有AI服务的状态'),
  auto_switch_enabled: z.boolean().describe('是否启用自动切换'),
  language: z.string().optional().describe('AI服务语言设置'),
  global_config_path: z.string().optional().describe('全局配置文件路径'),
  project_config_path: z.string().optional().describe('项目配置文件路径'),
  timeout: z.number().optional().describe('超时时间（秒）'),
  max_retries: z.number().optional().describe('最大重试次数'),
});
export type ServiceStatusResponse = z.infer<typeof ServiceStatusResponseSchema>;

// 错误响应
export const ErrorResponseSchema = z.object({
  error: z.string().describe('错误信息'),
  error_code: z.string().optional().describe('错误代码'),
  suggestions: z.array(z.string()).optional().describe('解决建议'),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// 成功响应
export const SuccessResponseSchema = z.object({
  success: z.boolean().describe('操作是否成功'),
  message: z.string().describe('成功信息'),
  data: z.any().optional().describe('返回数据'),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
