[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/im47cn-coderocket-mcp-badge.png)](https://mseep.ai/app/im47cn-coderocket-mcp)

# CodeRocket MCP

<div align="center">
  <img src="https://raw.githubusercontent.com/im47cn/coderocket-mcp/refs/heads/develop/docs/assets/banner.png" alt="CodeRocket Banner" />
</div>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/im47cn/coderocket-mcp?utm_source=oss&utm_medium=github&utm_campaign=im47cn%2Fcoderocket-mcp&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

一个完全独立的基于 Model Context Protocol (MCP) 的智能代码审查服务器，为AI编程工具提供专业的代码审查能力。

## 🚀 核心功能

- **多维度代码审查**：支持代码片段、Git提交、文件列表的全面审查
- **多AI服务支持**：原生集成Gemini、ClaudeCode等AI服务
- **智能故障转移**：自动切换AI服务，确保审查的可靠性
- **灵活配置管理**：支持环境变量和.env文件配置
- **专业提示词系统**：内置专业代码审查提示词，支持自定义
- **详细错误处理**：提供用户友好的错误信息和解决建议
- **完整日志记录**：详细的操作日志，便于调试和监控

## 📋 目录

- [安装](#-安装)
- [快速开始](#-快速开始)
- [MCP工具](#-mcp工具)
- [配置说明](#️-配置说明)
- [使用示例](#-使用示例)
- [提示词自定义](#-提示词自定义)
- [故障排除](#-故障排除)
- [开发指南](#-开发指南)

## 🛠 安装

### 快速安装（推荐）

#### 前置要求

1. **Node.js**: >= 18.0.0
2. **AI服务API密钥**: 至少配置一个AI服务（Gemini、ClaudeCode）

#### 直接使用（无需安装）

使用 npx 直接运行，无需全局安装：

```bash
# 直接启动 CodeRocket MCP 服务器
npx @yeepay/coderocket-mcp

# 查看帮助信息
npx @yeepay/coderocket-mcp help

# 查看版本信息
npx @yeepay/coderocket-mcp version
```

#### 全局安装（可选）

如果需要全局安装：

```bash
# 1. 全局安装CodeRocket MCP
npm install -g @yeepay/coderocket-mcp

# 2. 验证安装
npx -y @yeepay/coderocket-mcp --version

# 3. 运行测试
npx -y @yeepay/coderocket-mcp test

# 4. 启动服务器
npx -y @yeepay/coderocket-mcp start
```

### 开发者安装

如果您想从源码安装或参与开发：

```bash
# 1. 克隆项目
git clone https://github.com/im47cn/coderocket-mcp.git
cd coderocket-mcp

# 2. 运行安装脚本
./install.sh

# 3. 或手动安装
npm install
npm run build
npm start
```

## 🚀 快速开始

### 新功能：自动Git变更审查

使用新的 `review_changes` 工具，无需手动传递代码内容，自动检测并审查当前Git仓库中所有未提交的变更：

```bash
# 零参数调用，自动审查所有未提交变更
npx @yeepay/coderocket-mcp review_changes
```

### 1. 配置AI服务

配置至少一个AI服务的API密钥：

```bash
# 配置Gemini（推荐）
export GEMINI_API_KEY="your_gemini_api_key"

# 或配置ClaudeCode
export CLAUDECODE_API_KEY="your_claudecode_api_key"
```

### 2. 测试安装

```bash
# 运行功能测试
npx -y @yeepay/coderocket-mcp test
```

### 3. 在AI工具中配置

#### Claude Desktop配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "coderocket": {
      "command": "npx",
      "args": ["-y", "@yeepay/coderocket-mcp@latest"],
      "env": {
        "GEMINI_API_KEY": "your_gemini_api_key"
      }
    }
  }
}
```

#### 其他AI工具

对于其他支持MCP的AI工具，使用类似配置：

```json
{
  "mcp_servers": [
    {
      "name": "coderocket",
      "command": ["coderocket-mcp"],
      "environment": {
        "AI_SERVICE": "gemini",
        "GEMINI_API_KEY": "your_api_key"
      }
    }
  ]
}
```

## 🔧 MCP工具

CodeRocket MCP 提供以下工具：

### 1. review_code
审查代码片段，提供详细的质量分析和改进建议。

**参数：**
- `code` (string): 要审查的代码内容
- `language` (string, 可选): 代码语言
- `context` (string, 可选): 代码上下文信息
- `ai_service` (string, 可选): 指定AI服务
- `custom_prompt` (string, 可选): 自定义审查提示词

### 2. review_commit
审查Git提交，分析代码变更的质量和影响。

**参数：**
- `commit_hash` (string, 可选): 提交哈希，默认为最新提交
- `repository_path` (string, 可选): Git仓库路径
- `ai_service` (string, 可选): 指定AI服务
- `custom_prompt` (string, 可选): 自定义审查提示词

### 3. review_files
审查指定文件列表，提供全面的代码质量评估。

**参数：**
- `files` (array): 要审查的文件路径列表
- `repository_path` (string, 可选): Git仓库路径
- `ai_service` (string, 可选): 指定AI服务
- `custom_prompt` (string, 可选): 自定义审查提示词

### 4. configure_ai_service
配置AI服务设置，包括服务选择、API密钥等。

**参数：**
- `service` (string): AI服务名称 (gemini/claudecode)
- `scope` (string, 可选): 配置范围 (project/global)
- `api_key` (string, 可选): API密钥
- `timeout` (number, 可选): 超时时间
- `max_retries` (number, 可选): 最大重试次数

### 5. get_ai_service_status
获取所有AI服务的状态信息，包括可用性和配置状态。

**参数：** 无

## ⚙️ 配置说明

### 环境变量

```bash
# AI服务配置
AI_SERVICE=gemini                    # 默认AI服务
AI_AUTO_SWITCH=true                  # 启用自动切换
AI_TIMEOUT=30                        # 超时时间（秒）
AI_MAX_RETRIES=3                     # 最大重试次数

# API密钥
GEMINI_API_KEY=your_gemini_key
CLAUDECODE_API_KEY=your_claudecode_key

# 日志配置
NODE_ENV=development                 # 开发模式启用详细日志
```

### 配置文件

**全局配置**: `~/.coderocket/env`
**项目配置**: `./.env`

配置优先级：环境变量 > 项目配置 > 全局配置 > 默认值

## 📖 使用示例

### 审查代码片段

```json
{
  "tool": "review_code",
  "arguments": {
    "code": "function add(a, b) {\n  return a + b;\n}",
    "language": "javascript",
    "context": "简单的加法函数"
  }
}
```

### 审查Git提交

```json
{
  "tool": "review_commit",
  "arguments": {
    "repository_path": "/path/to/repo",
    "commit_hash": "abc123"
  }
}
```

### 配置AI服务

```json
{
  "tool": "configure_ai_service",
  "arguments": {
    "service": "gemini",
    "scope": "project",
    "api_key": "your_api_key"
  }
}
```

### 获取服务状态

```json
{
  "tool": "get_ai_service_status",
  "arguments": {}
}
```

## 🎨 提示词自定义

CodeRocket MCP 使用统一的提示词系统，所有代码审查功能都使用同一个提示词模板：

### 统一提示词

- **统一模板**：`git-commit-review-prompt.md` - 适用于所有代码审查场景
- **功能覆盖**：Git 提交审查、代码片段审查、文件审查、变更审查

### 提示词优先级

1. **项目级提示词**（最高优先级）：`./prompts/git-commit-review-prompt.md`
2. **全局提示词**：`~/.coderocket/prompts/git-commit-review-prompt.md`
3. **内置默认提示词**（最低优先级）

### 自定义示例

创建项目级提示词：

```bash
mkdir -p prompts
echo "# 自定义代码审查提示词..." > prompts/git-commit-review-prompt.md
```

创建全局提示词：

```bash
mkdir -p ~/.coderocket/prompts
echo "# 全局代码审查提示词..." > ~/.coderocket/prompts/git-commit-review-prompt.md
```

### 统一性优势

- **一致性**：所有审查功能使用相同的评判标准
- **维护性**：只需维护一个提示词文件
- **可预测性**：审查结果风格和格式保持一致

## 🔍 故障排除

### 常见问题

**问题 1**: MCP服务器启动失败

```bash
# 检查Node.js版本
node --version  # 应该 >= 18.0.0

# 检查依赖安装
npm install

# 重新构建
npm run build
```

**问题 2**: AI服务不可用

```bash
# 检查API密钥配置
echo $GEMINI_API_KEY
echo $CLAUDECODE_API_KEY

# 检查配置文件
cat ~/.coderocket/env
cat .env

# 使用get_ai_service_status工具检查服务状态
npx @yeepay/coderocket-mcp test
```

**问题 3**: 配置文件权限问题

```bash
# 检查配置目录权限
ls -la ~/.coderocket/
chmod 700 ~/.coderocket/
chmod 600 ~/.coderocket/env

# 检查项目配置文件
ls -la .env
chmod 600 .env
```

### 调试模式

启用详细日志：

```bash
DEBUG=true NODE_ENV=development npx @yeepay/coderocket-mcp
```

查看详细错误信息：

```bash
# 启用调试模式
export DEBUG=true
export NODE_ENV=development
npx @yeepay/coderocket-mcp
```

## 👨‍💻 开发指南

### 项目结构

```
coderocket-mcp/
├── src/
│   ├── index.ts          # MCP服务器入口
│   ├── coderocket.ts     # 核心服务类
│   ├── types.ts          # 类型定义
│   └── logger.ts         # 日志和错误处理
├── dist/                 # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

### 开发环境设置

```bash
# 安装开发依赖
npm install

# 开发模式运行
npm run dev

# 代码检查
npm run lint

# 格式化代码
npm run format

# 运行测试
npm test
```

### 添加新功能

1. 在 `types.ts` 中定义新的类型
2. 在 `coderocket.ts` 中实现业务逻辑
3. 在 `index.ts` 中注册新的MCP工具
4. 添加相应的测试用例
5. 更新文档

## 🤝 贡献

我们欢迎社区贡献！请参考 [CodeRocket-MCP贡献指南](https://github.com/im47cn/coderocket-mcp/blob/main/CONTRIBUTING.md)。

### 快速开始

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 创建 Pull Request

## 📄 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。

## 🔗 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP官方文档
- [问题反馈](https://github.com/im47cn/coderocket/issues) - 报告问题或建议
- [NPM包](https://www.npmjs.com/package/@yeepay/coderocket-mcp) - NPM官方页面

## 📊 特性对比

| 功能 | CodeRocket-CLI | CodeRocket-MCP |
|------|----------------|----------------|
| 独立运行 | ❌ (需要配置) | ✅ (开箱即用) |
| MCP协议支持 | ❌ | ✅ |
| 代码片段审查 | ❌ | ✅ |
| AI工具集成 | ❌ | ✅ |
| 多AI服务支持 | ✅ | ✅ |
| Git Hooks集成 | ✅ | ❌ |
| 自动MR创建 | ✅ | ❌ |
| 详细审查报告 | ✅ | ✅ |
| 环境变量配置 | ✅ | ✅ |

---

**CodeRocket MCP** - 让AI编程工具拥有专业的代码审查能力 🚀
