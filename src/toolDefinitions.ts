import { z } from 'zod';
import {
  ReviewCodeRequestSchema,
  ReviewChangesRequestSchema,
  ReviewCommitRequestSchema,
  ReviewFilesRequestSchema,
  ConfigureAIServiceRequestSchema,
} from './types.js';

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
};

export const toolDefinitions: ToolDef[] = [
  {
    name: 'review_code',
    description: `🔍 **代码片段智能审查工具**

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
    schema: ReviewCodeRequestSchema,
  },
  {
    name: 'review_changes',
    description: `🚀 **Git变更自动审查工具**

**功能**: 自动检测并审查当前Git仓库中所有未提交的代码变更，无需手动传递代码内容。

**适用场景**:
- 提交前的自动化代码质量检查
- 开发过程中的实时代码审查
- CI/CD流程中的质量门禁
- 团队协作中的代码规范检查

**AI分析维度**:
- 变更逻辑的合理性和完整性
- 代码质量和最佳实践遵循
- 潜在的安全风险和性能问题
- 与现有代码的一致性检查
- 测试覆盖和文档更新建议

**自动化特性**:
- 零参数调用，自动检测Git变更
- 支持已暂存和未暂存变更的分别审查
- 智能识别文件类型和编程语言
- 提供上下文相关的改进建议

**输出格式**: 详细的变更审查报告，包含文件级和整体级分析`,
    schema: ReviewChangesRequestSchema,
  },
  {
    name: 'review_commit',
    description: `📝 **Git提交智能审查工具**

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
    schema: ReviewCommitRequestSchema,
  },
  {
    name: 'review_files',
    description: `📁 **多文件批量审查工具**

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
    schema: ReviewFilesRequestSchema,
  },
  {
    name: 'configure_ai_service',
    description: `⚙️ **AI服务配置管理工具**

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
    schema: ConfigureAIServiceRequestSchema,
  },
  {
    name: 'get_ai_service_status',
    description: `📊 **AI服务状态监控工具**

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
    schema: z.object({}), // 无参数工具
  },
];
