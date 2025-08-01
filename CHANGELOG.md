# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2025-08-01

### 🔧 Critical MCP Protocol Fixes

#### 🐛 Fixed

- **MCP 协议兼容性问题**: 解决 AI 编程工具无法识别工具的根本原因
  - 修复启动脚本的 async/await 语法错误，确保 MCP 客户端能正确启动服务器
  - 修复服务器版本号硬编码问题，现在正确从 package.json 读取实际版本 (1.1.2)
  - 重构 JSON Schema 生成，替换有问题的 Zod 转换函数为手动创建的完整 Schema

#### ✨ Enhanced

- **工具描述大幅改进**: 为每个工具编写详细的功能说明、适用场景和参数文档
  - `review_code`: 🔍 代码片段智能审查工具，包含完整的功能介绍和 AI 分析维度说明
  - `review_commit`: 📝 Git 提交智能审查工具，详细说明变更分析和风险评估功能
  - `review_files`: 📁 多文件批量审查工具，涵盖项目级质量评估和架构分析
  - `configure_ai_service`: ⚙️ AI 服务配置管理工具，包含支持的服务和安全性说明
  - `get_ai_service_status`: 📊 AI 服务状态监控工具，提供完整的健康状况报告

- **JSON Schema 定义完善**:
  - 为所有工具参数提供完整的类型定义和描述
  - 正确标记必需参数和可选参数
  - 添加枚举值约束和默认值说明
  - 确保 AI 编程工具能准确理解参数要求

#### 🧪 Tested

- **100% MCP 协议兼容性测试通过**:
  - ✅ 服务器启动和初始化测试
  - ✅ 工具列表获取测试
  - ✅ 工具调用和参数验证测试
  - ✅ 错误处理和响应格式测试

- **所有单元测试通过** (8/8，100% 成功率):
  - ✅ ConfigManager 配置管理测试
  - ✅ PromptManager 提示管理测试
  - ✅ AI 服务故障转移测试
  - ✅ 边界条件和异常处理测试

#### 🎯 Impact

此版本解决了用户报告的关键问题："我配置到AI编程工具中无法正常使用，也不能显示有哪些tool"。现在 AI 编程工具应该能够：
- 正确启动 MCP 服务器
- 识别所有可用工具
- 理解每个工具的详细功能和参数要求
- 成功调用工具并获得结构化响应

## [1.1.1] - 2025-08-01

### 🧹 Service Cleanup & Test Enhancement

#### ✨ Removed

- **OpenCode Service**: Removed expired OpenCode service integration
  - Removed from type definitions and service configurations
  - Updated AI service manager to only support Gemini and ClaudeCode
  - Cleaned up documentation and environment variable references

#### 🐛 Critical Bug Fixes

- **Version Display Issue**: Fixed version command always showing hardcoded fallback
  - Improved error handling in bin/coderocket-mcp version command
  - Added debugging information when package.json reading fails
  - Version now correctly displays v1.1.1 from package.json

- **ConfigManager Initialization Error**: Fixed "ConfigManager 未初始化" startup error
  - Added ConfigManager.initialize() call in MCP server startup
  - Implemented proper initialization checks in AI service classes
  - Added intelligent fallback logic for uninitialized ConfigManager
  - Fixed SmartAIManager to handle delayed configuration loading
  - Improved error handling with detailed error messages and debug mode

- **Startup Script Error Handling**: Enhanced async/await patterns
  - Fixed dynamic import error handling in bin/coderocket-mcp
  - Added proper exit codes for different failure scenarios
  - Improved TypeScript error handling for unknown error types

#### 🧪 Enhanced Testing

- **Comprehensive Test Coverage**: Added extensive test coverage for core components
  - **ConfigManager Tests**: Configuration loading, priority hierarchy, environment variable handling
  - **PromptManager Tests**: Prompt loading, caching mechanism, default fallbacks
  - **AI Service Failover Tests**: Service availability, intelligent switching, error handling
  - **Enhanced Error Scenarios**: Better coverage of edge cases and error conditions
- **Test Reliability**: Improved test isolation and environment cleanup
- **100% Test Pass Rate**: All 8 test categories now pass successfully

#### 📊 Test Results

- Total Tests: 8
- Pass Rate: 100% ✅
- Coverage Areas: Core components, service integration, error handling, boundary conditions

## [1.1.0] - 2025-08-01

### 🚀 Major Changes - Complete Independence

This release marks a major milestone: **CodeRocket MCP is now completely independent** and no longer requires `coderocket-cli` as a dependency.

### ✨ Added

- **Independent Configuration Management**: New `ConfigManager` class with support for:
  - Environment variables
  - Project-level `.env` files
  - Global `~/.coderocket/env` configuration
  - Priority hierarchy: env vars > project .env > global .env > defaults

- **Independent Prompt Management**: New `PromptManager` class with support for:
  - Project-level prompts in `./prompts/` directory
  - Global prompts in `~/.coderocket/prompts/` directory
  - Built-in default prompts

- **Direct AI Service Integration**: Native API implementations for:
  - **Gemini**: Using `@google/generative-ai` SDK with `gemini-1.5-flash` model
  - **ClaudeCode**: Using `@anthropic-ai/sdk` for direct API calls
  - **OpenCode**: HTTP-based API integration with axios

- **Intelligent AI Manager**: New `AIManager` class with:
  - Smart service selection and failover
  - Automatic retry logic with exponential backoff
  - Service health monitoring
  - Load balancing across available services

- **Enhanced Error Handling**: New `ErrorHandler` class with:
  - Contextual error messages
  - User-friendly error suggestions
  - Detailed logging for debugging

### 🔄 Changed

- **Startup Method**: Now supports direct execution without parameters
  - Old: `coderocket-mcp start`
  - New: `npx @yeepay/coderocket-mcp` (recommended)
  - Still supports: `coderocket-mcp` (if globally installed)

- **Configuration Approach**: Moved from CLI-based to environment variable-based configuration
  - Supports standard MCP configuration patterns
  - Maintains backward compatibility with existing `.env` files

- **Model Updates**: Updated Gemini model from deprecated `gemini-pro` to `gemini-1.5-flash`

### 🗑️ Removed

- **CodeRocket-CLI Dependency**: Completely removed dependency on `coderocket-cli`
- **Shell Script Execution**: Replaced shell script calls with direct API implementations
- **Path Detection Logic**: Removed `findCoderocketCliPath()` and related functions
- **CLI Command Execution**: Removed `executeShellCommand()` and `callAIServiceManager()`

### 🛠️ Technical Improvements

- **Type Safety**: Enhanced TypeScript types and error handling
- **Performance**: Direct API calls eliminate shell script overhead
- **Reliability**: Reduced external dependencies and failure points
- **Maintainability**: Cleaner architecture with separation of concerns

### 📚 Documentation

- Updated README.md with independent installation instructions
- Added comprehensive environment variable documentation
- Updated troubleshooting guide for independent operation
- Enhanced feature comparison table

### 🧪 Testing

- Updated test suite for independent operation
- Added configuration management tests
- Enhanced error scenario testing
- Improved boundary condition testing
- All tests now pass with 100% success rate

### 🔧 Migration Guide

For users upgrading from previous versions:

1. **No more CLI dependency**: Uninstall `coderocket-cli` if only used for MCP
2. **Environment variables**: Move API keys to environment variables or `.env` files
3. **New startup command**: Use `npx @yeepay/coderocket-mcp` instead of `coderocket-mcp start`
4. **Configuration files**: Existing `.env` files continue to work

### 📦 Dependencies

- Added: `@google/generative-ai@^0.21.0`
- Added: `@anthropic-ai/sdk@^0.27.0`
- Added: `axios@^1.6.0`
- Removed: All `coderocket-cli` related dependencies

---

## [1.0.1] - 2024-XX-XX

### Fixed
- Initial bug fixes and stability improvements

## [1.0.0] - 2024-XX-XX

### Added
- Initial release with `coderocket-cli` dependency
- Basic MCP server functionality
- Code review capabilities
