# AI 服务配置指南

## 🔧 配置 AI 服务进行代码审查

为了使用 CodeRocket MCP 的代码审查功能，需要配置至少一个 AI 服务。

### 1. Gemini 配置

```bash
# 在项目根目录创建 .env 文件
echo "GOOGLE_API_KEY=your_gemini_api_key_here" >> .env
echo "AI_SERVICE=gemini" >> .env
```

### 2. ClaudeCode 配置

```bash
# 在项目根目录创建 .env 文件
echo "ANTHROPIC_API_KEY=your_claude_api_key_here" >> .env
echo "AI_SERVICE=claudecode" >> .env
```

### 3. 全局配置（推荐）

```bash
# 创建全局配置目录
mkdir -p ~/.coderocket

# 配置全局 AI 服务
echo "GOOGLE_API_KEY=your_gemini_api_key_here" >> ~/.coderocket/env
echo "ANTHROPIC_API_KEY=your_claude_api_key_here" >> ~/.coderocket/env
echo "AI_SERVICE=gemini" >> ~/.coderocket/env
```

### 4. 验证配置

```bash
# 检查 AI 服务状态
npx @yeepay/coderocket-mcp get-ai-service-status

# 测试代码审查
npx @yeepay/coderocket-mcp review-commit
```

### 5. 故障排除

如果遇到 API 配额问题：
1. 检查 API 密钥是否有效
2. 确认 API 配额是否充足
3. 尝试切换到其他 AI 服务
4. 等待配额重置（通常24小时）

### 6. 自动化代码审查

安装 Git 钩子：
```bash
# 复制预提交钩子
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

这样每次提交前都会自动进行代码审查。
