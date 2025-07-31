# CodeRocket MCP

<div align="center">
  <img src="https://raw.githubusercontent.com/im47cn/coderocket-mcp/refs/heads/develop/docs/assets/banner.png" alt="CodeRocket Banner" />
</div>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

一个基于 Model Context Protocol (MCP) 的智能代码审查 MCP，集成了 CodeRocket-CLI 的强大功能，为AI编程工具提供专业的代码审查能力。

## 🚀 核心功能

- **多维度代码审查**：支持代码片段、Git提交、文件列表的全面审查
- **多AI服务支持**：集成Gemini、OpenCode、ClaudeCode等多种AI服务
- **智能故障转移**：自动切换AI服务，确保审查的可靠性
- **灵活配置管理**：支持项目级和全局级配置
- **详细错误处理**：提供用户友好的错误信息和解决建议
- **完整日志记录**：详细的操作日志，便于调试和监控

## 📋 目录

- [安装](#-安装)
- [快速开始](#-快速开始)
- [MCP工具](#-mcp工具)
- [配置说明](#️-配置说明)
- [使用示例](#-使用示例)
- [故障排除](#-故障排除)
- [开发指南](#-开发指南)

## 🛠 安装

### 正式安装（推荐）

#### 前置要求

1. **Node.js**: >= 18.0.0
2. **CodeRocket-CLI**: 需要先安装 [CodeRocket-CLI](https://github.com/im47cn/coderocket-cli)
3. **AI服务**: 至少配置一个AI服务（Gemini、OpenCode或ClaudeCode）

#### 安装过程

从npm注册表安装：

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

> **注意**: CodeRocket MCP依赖于CodeRocket-CLI，请确保先安装CodeRocket-CLI。

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

### 1. 配置AI服务

配置至少一个AI服务的API密钥：

```bash
# 配置Gemini（推荐）
export GEMINI_API_KEY="your_gemini_api_key"

# 或配置OpenCode
export OPENCODE_API_KEY="your_opencode_api_key"

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
      "args": ["-y", "@yeepay/coderocket-mcp", "start"],
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
      "command": ["coderocket-mcp", "start"],
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
- `service` (string): AI服务名称 (gemini/opencode/claudecode)
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
OPENCODE_API_KEY=your_opencode_key
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
# 检查AI服务状态
gemini --version
opencode --version
claudecode --version

# 重新配置AI服务
gemini config
```

**问题 3**: CodeRocket-CLI路径错误

```bash
# 设置环境变量指定路径
export CODEROCKET_CLI_PATH=/path/to/coderocket-cli

# 或在项目中创建符号链接
ln -s /path/to/coderocket-cli ./coderocket-cli
```

### 调试模式

启用详细日志：

```bash
NODE_ENV=development npm start
```

查看日志文件：

```bash
# 日志文件位置
tail -f /tmp/coderocket-mcp.log
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

我们欢迎社区贡献！请参考 [CodeRocket-CLI贡献指南](../coderocket-cli/CONTRIBUTING.md)。

### 快速开始

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 创建 Pull Request

## 📄 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。

## 🔗 相关链接

- [CodeRocket-CLI](../coderocket-cli) - 核心CLI工具
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP官方文档
- [问题反馈](https://github.com/im47cn/coderocket-cli/issues) - 报告问题或建议

## 📊 特性对比

| 功能 | CodeRocket-CLI | CodeRocket-MCP |
|------|----------------|----------------|
| Git Hooks集成 | ✅ | ❌ |
| MCP协议支持 | ❌ | ✅ |
| 代码片段审查 | ❌ | ✅ |
| AI工具集成 | ❌ | ✅ |
| 多AI服务支持 | ✅ | ✅ |
| 自动MR创建 | ✅ | ❌ |
| 详细审查报告 | ✅ | ✅ |

---

**CodeRocket MCP** - 让AI编程工具拥有专业的代码审查能力 🚀
