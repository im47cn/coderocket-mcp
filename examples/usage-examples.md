# CodeRocket MCP 使用示例

本文档提供了CodeRocket MCP的详细使用示例。

## 配置示例

### Claude Desktop配置

在Claude Desktop的配置文件中添加：

```json
{
  "mcpServers": {
    "coderocket": {
      "command": "node",
      "args": ["/path/to/coderocket-mcp/dist/index.js"],
      "env": {
        "AI_SERVICE": "gemini",
        "AI_AUTO_SWITCH": "true",
        "GEMINI_API_KEY": "your_gemini_api_key"
      }
    }
  }
}
```

### 其他AI工具配置

对于支持MCP的其他AI工具，配置方式类似：

```json
{
  "mcp_servers": [
    {
      "name": "coderocket",
      "command": ["node", "/path/to/coderocket-mcp/dist/index.js"],
      "environment": {
        "AI_SERVICE": "gemini",
        "GEMINI_API_KEY": "your_api_key"
      }
    }
  ]
}
```

## 使用示例

### 1. 审查代码片段

**用户提问：**
"请帮我审查这段JavaScript代码的质量"

**AI工具调用：**
```json
{
  "tool": "review_code",
  "arguments": {
    "code": "function calculateTotal(items) {\n  var total = 0;\n  for (var i = 0; i < items.length; i++) {\n    total += items[i].price * items[i].quantity;\n  }\n  return total;\n}",
    "language": "javascript",
    "context": "电商购物车总价计算函数"
  }
}
```

**预期响应：**
```json
{
  "status": "⚠️",
  "summary": "功能正确但可以优化，建议使用现代JavaScript语法",
  "details": "代码功能正确实现了购物车总价计算，但存在以下改进空间：\n1. 使用let/const替代var\n2. 可以使用reduce方法简化代码\n3. 添加输入验证\n4. 考虑数值精度问题",
  "ai_service_used": "gemini",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### 2. 审查Git提交

**用户提问：**
"请审查我最新的Git提交"

**AI工具调用：**
```json
{
  "tool": "review_commit",
  "arguments": {
    "repository_path": "/path/to/project"
  }
}
```

### 3. 审查特定文件

**用户提问：**
"请审查src/utils.js和src/api.js这两个文件"

**AI工具调用：**
```json
{
  "tool": "review_files",
  "arguments": {
    "files": ["src/utils.js", "src/api.js"],
    "repository_path": "/path/to/project"
  }
}
```

### 4. 配置AI服务

**用户提问：**
"请帮我配置使用OpenCode服务进行代码审查"

**AI工具调用：**
```json
{
  "tool": "configure_ai_service",
  "arguments": {
    "service": "opencode",
    "scope": "project",
    "api_key": "your_opencode_api_key",
    "timeout": 60
  }
}
```

### 5. 检查服务状态

**用户提问：**
"当前有哪些AI服务可用？"

**AI工具调用：**
```json
{
  "tool": "get_ai_service_status",
  "arguments": {}
}
```

**预期响应：**
```json
{
  "current_service": "gemini",
  "services": [
    {
      "service": "gemini",
      "available": true,
      "configured": true
    },
    {
      "service": "opencode",
      "available": true,
      "configured": false,
      "config_command": "opencode config"
    },
    {
      "service": "claudecode",
      "available": false,
      "configured": false,
      "install_command": "npm install -g @anthropic-ai/claude-code"
    }
  ],
  "auto_switch_enabled": true
}
```

## 高级用法

### 自定义审查提示词

```json
{
  "tool": "review_code",
  "arguments": {
    "code": "your_code_here",
    "language": "python",
    "custom_prompt": "请特别关注这段代码的性能优化和安全性，并提供具体的改进建议。重点检查：1. 算法复杂度 2. 内存使用 3. 潜在的安全漏洞"
  }
}
```

### 批量文件审查

```json
{
  "tool": "review_files",
  "arguments": {
    "files": [
      "src/components/Header.jsx",
      "src/components/Footer.jsx",
      "src/components/Sidebar.jsx",
      "src/utils/helpers.js",
      "src/api/endpoints.js"
    ],
    "custom_prompt": "请重点关注React组件的性能优化和可维护性"
  }
}
```

## 错误处理示例

当遇到错误时，MCP会返回详细的错误信息：

```json
{
  "error": "AI服务配置失败: gemini 服务不可用",
  "error_code": "AI_SERVICE_ERROR",
  "suggestions": [
    "检查AI服务配置",
    "验证API密钥是否正确",
    "确保网络连接正常",
    "尝试切换到其他AI服务"
  ]
}
```

## 最佳实践

1. **配置多个AI服务**：建议配置多个AI服务作为备用，启用自动切换功能
2. **合理设置超时**：根据网络情况调整超时时间
3. **使用项目级配置**：为不同项目设置不同的审查规则
4. **定期更新**：保持CodeRocket-CLI和MCP服务器的最新版本

## 故障排除

### 常见问题解决

1. **服务启动失败**：检查Node.js版本和依赖安装
2. **AI服务不可用**：验证API密钥配置和网络连接
3. **审查结果异常**：检查代码格式和提示词设置

更多详细信息请参考主README文档。
