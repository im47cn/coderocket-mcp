# 提示词管理系统

## 概述

coderocket-mcp 现在采用与 coderocket-cli 兼容的提示词管理方式，支持层级查找和提示词文件共享。

## 特性

### 1. 层级查找
提示词文件按以下优先级查找：
1. **项目级** - `./prompts/` 目录
2. **全局级** - `~/.coderocket/prompts/` 目录  
3. **默认值** - 内置的默认提示词

### 2. 统一提示词设计
所有审查功能统一使用 `git-commit-review-prompt.md`，实现：
- **一致的审查标准**：所有类型的代码审查使用相同的专业标准
- **统一的输出格式**：保持审查结果的格式一致性
- **简化的维护**：只需维护一个高质量的提示词文件
- **内容差异化**：通过被审查的内容类型（代码片段、Git变更、文件等）自然区分

功能名到文件名的映射关系（统一映射）：

| 功能名 | 文件名 | 说明 |
|--------|--------|------|
| `git_commit` | `git-commit-review-prompt.md` | Git提交审查 |
| `review_commit` | `git-commit-review-prompt.md` | Git提交审查 |
| `code_review` | `git-commit-review-prompt.md` | 代码片段审查（统一） |
| `review_code` | `git-commit-review-prompt.md` | 代码片段审查（统一） |
| `review_changes` | `git-commit-review-prompt.md` | Git变更审查（统一） |
| `git_changes` | `git-commit-review-prompt.md` | Git变更审查（统一） |
| `review_files` | `git-commit-review-prompt.md` | 多文件审查（统一） |
| `file_review` | `git-commit-review-prompt.md` | 多文件审查（统一） |
| `base` | `git-commit-review-prompt.md` | 基础提示词（统一） |

### 3. 兼容性
- 与 coderocket-cli 使用相同的文件命名规范
- 支持两个项目共享提示词文件
- 向后兼容现有的API接口

## 使用方法

### 项目级提示词
在项目根目录创建 `prompts/` 目录，放置自定义提示词文件：

```bash
mkdir prompts
cp ~/.coderocket/prompts/git-commit-review-prompt.md prompts/
```

### 全局级提示词
在用户主目录创建全局提示词目录：

```bash
mkdir -p ~/.coderocket/prompts
# 将提示词文件放置在此目录
```

### 编程接口
```typescript
import { PromptManager } from './prompts/PromptManager.js';

// 初始化提示词管理器
await PromptManager.initialize();

// 加载提示词
const prompt = await PromptManager.loadPrompt('git_commit');

// 获取提示词查找路径
const paths = PromptManager.getPromptPaths('git-commit-review-prompt.md');
```

## 提示词文件格式

### git-commit-review-prompt.md
专业的Git提交审查提示词，包含：
- 角色定义
- 执行模式
- 审查指令
- 全局代码搜索分析
- 审查维度
- 审查结果输出格式

### code-review-prompt.md
代码片段审查提示词，包含：
- 审查维度（正确性、质量、性能、安全性等）
- 审查输出格式
- 问题标记规范

### git-changes-review-prompt.md
Git变更审查提示词，包含：
- 变更完整性检查
- 变更一致性验证
- 影响范围评估

### file-review-prompt.md
多文件综合审查提示词，包含：
- 架构一致性分析
- 依赖关系检查
- 代码复用评估

## 迁移指南

### 从旧版本迁移
1. 现有的API调用无需修改
2. 如需自定义提示词，创建对应的.md文件
3. 文件名需要遵循新的命名规范

### 与coderocket-cli共享
1. 确保两个项目都安装在系统中
2. 在 `~/.coderocket/prompts/` 目录放置共享的提示词文件
3. 两个项目会自动使用相同的提示词

## 调试

### 查看查找路径
```typescript
const paths = PromptManager.getPromptPaths('git-commit-review-prompt.md');
console.log('查找路径:', paths);
```

### 检查可用提示词
```typescript
const available = PromptManager.getAvailablePrompts();
console.log('可用提示词:', available);
```

### 测试提示词加载
```typescript
const prompt = await PromptManager.loadPrompt('git_commit');
console.log('提示词内容:', prompt?.substring(0, 100) + '...');
```

## 注意事项

1. **文件编码**: 提示词文件必须使用UTF-8编码
2. **文件权限**: 确保提示词文件具有读取权限
3. **缓存机制**: 提示词会被缓存，修改文件后需要重启应用
4. **错误处理**: 文件不存在时会自动回退到默认提示词
5. **性能考虑**: 首次加载时会读取所有提示词文件

## 故障排除

### 提示词未生效
1. 检查文件路径是否正确
2. 确认文件名是否符合映射规范
3. 验证文件编码和权限

### 共享不生效
1. 确认全局目录 `~/.coderocket/prompts/` 存在
2. 检查文件是否正确放置
3. 重启应用以清除缓存

### 性能问题
1. 避免提示词文件过大
2. 定期清理不需要的提示词文件
3. 考虑使用项目级提示词减少全局查找
