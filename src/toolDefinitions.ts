import { z } from 'zod';
import {
  ReviewCodeRequestSchema,
  ReviewChangesRequestSchema,
  ReviewCommitRequestSchema,
  ReviewFilesRequestSchema,
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
];
