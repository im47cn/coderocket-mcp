# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2025-08-01

### 🔧 Critical Dependency Fix: Complete Independence

#### 🐛 Fixed
- **Self-Dependency Issue**: Removed incorrect self-reference `@yeepay/coderocket-mcp` from dependencies
- **Package Integrity**: Fixed circular dependency that could cause installation issues
- **Clean Dependencies**: Ensured only necessary external dependencies are included

#### ✅ Verified Independence
- **No CLI Dependencies**: Confirmed zero dependencies on `coderocket-cli`
- **Standard Git Commands**: All shell commands are standard Git operations only
- **Independent Configuration**: Uses separate `~/.coderocket/` directory structure
- **Self-Contained**: All functionality implemented with direct API calls

#### 🧪 Quality Assurance
- **100% Test Pass Rate**: All 9 tests continue to pass after dependency cleanup
- **Functionality Verified**: Git change detection and AI review working perfectly
- **No Breaking Changes**: All existing functionality preserved

---

## [1.2.2] - 2025-08-01

### 🎨 Visual Enhancement: Beautiful ASCII Art Banner

#### ✨ New Features
- **精美 Banner 显示**: 添加了参考 coderocket-cli 设计的渐变色 ASCII Art Banner
- **响应式界面**: 根据终端宽度自动选择合适的 Banner 显示（长版本/短版本）
- **专业级视觉效果**: 蓝绿渐变色彩，提升用户体验和专业感
- **多场景 Banner**: 支持启动、成功、错误等不同场景的 Banner 显示

#### 🛠️ Technical Improvements
- **Banner 模块**: 新增 `src/banner.ts` 模块，提供完整的 Banner 显示功能
- **启动界面优化**: 启动时显示精美的渐变 Banner 和服务信息
- **版本信息集成**: Banner 中动态显示当前版本号和协议信息
- **颜色系统**: 完整的 ANSI 颜色代码支持，包括 256 色渐变效果

#### 💫 User Experience
- **视觉一致性**: 与 coderocket-cli 保持一致的设计风格
- **信息丰富**: 启动时显示所有可用工具和功能说明
- **专业外观**: 媲美 Gemini CLI 的高质量界面设计
- **终端兼容**: 支持不同宽度的终端窗口自适应显示

---

## [1.2.1] - 2025-08-01

### 🧪 Testing & Quality Assurance

#### ✅ Enhanced Testing Coverage
- **Complete Test Suite**: Added comprehensive tests for `reviewChanges` functionality
- **Git Integration Tests**: Validated Git repository detection, status parsing, and diff analysis
- **API Integration Tests**: Verified actual AI service calls with real Git changes
- **100% Test Pass Rate**: All 9 tests passing with full functionality coverage

#### 🔧 Test Infrastructure Improvements
- **Unit Test Coverage**: Added `testReviewChanges` function with detailed validation
- **Edge Case Handling**: Tested boundary conditions and error scenarios
- **Real-world Validation**: Actual API calls successfully detected 4 changed files
- **Quality Gates**: Comprehensive validation of all core features

---

## [1.2.0] - 2025-08-01

### 🚀 Major Feature: Automatic Git Changes Review

#### ✨ Added
- **New `review_changes` Tool**: Revolutionary zero-parameter code review tool
  - Automatically detects and reviews all uncommitted Git changes
  - No need to manually copy/paste code content
  - Supports both staged and unstaged changes
  - Intelligent file type detection and language recognition
  - Comprehensive change analysis with context awareness

#### 🔧 Enhanced Architecture
- **Smart Git Integration**: Built-in Git repository detection and validation
- **Flexible Change Detection**: Configurable inclusion of staged/unstaged changes
- **Advanced Diff Analysis**: Detailed parsing of Git status and diff output
- **Context-Aware Prompts**: Dynamic prompt generation based on actual changes

#### 📝 API Improvements
- **New Type Definitions**: Added `ReviewChangesRequest` and related schemas
- **Enhanced Tool Registration**: Updated MCP tool registry with comprehensive descriptions
- **Backward Compatibility**: Maintained existing `review_code` tool for manual use cases

#### 🛠️ Technical Features
- **Repository Validation**: Automatic Git repository detection
- **Status Parsing**: Intelligent Git status output interpretation
- **Change Categorization**: Clear distinction between different change types
- **Error Handling**: Robust error handling for non-Git directories

#### 📚 Documentation Updates
- **README Enhancement**: Added quick start guide for new `review_changes` tool
- **Tool Descriptions**: Comprehensive documentation of all available tools
- **Usage Examples**: Clear examples for different use cases

---

## [1.1.6] - 2025-08-01

### 🌐 Language Configuration Enhancement

#### ✨ Added
- **AI Language Configuration**: Added `AI_LANGUAGE` configuration option to control AI service response language
  - Default language set to `zh-CN` (Chinese)
  - Support for `en-US` (English) and other language codes
  - Language setting can be configured via environment variables or configuration files

#### 🔧 Enhanced
- **Prompt Enhancement**: All prompts now explicitly request Chinese responses
  - Added language instructions to `git-commit-review-prompt`
  - Added language instructions to `code-review-prompt`
  - Enhanced `executeAIReview` method to dynamically add language requirements

#### 📝 Configuration Updates
- **ConfigManager**: Added `getAILanguage()` method for language configuration retrieval
- **Service Configuration**: Added language parameter to `configureAIService` API
- **Status Response**: Added language information to service status response

#### 🛠️ API Improvements
- **Tool Schema**: Updated `configure_ai_service` tool to include language parameter
- **Type Definitions**: Enhanced `ConfigureAIServiceRequest` and `ServiceStatusResponse` schemas

---

## [1.1.5] - 2025-08-01

### 🔧 Error Message Cleanup

#### 🧹 Removed Legacy References
- **Fixed Error Messages**: Removed all references to `coderocket-cli` from error messages and suggestions
  - Updated `src/index.ts` error suggestions to focus on independent operation
  - Updated `src/logger.ts` error handling to remove CLI dependency references
  - Error messages now provide relevant suggestions for the independent version

#### 📝 Documentation Updates
- **Cleaned Up Documentation**: Removed outdated references to `coderocket-cli` dependency
- **Updated Links**: Fixed repository links to point to the correct monorepo structure
- **Removed Legacy Files**: Cleaned up obsolete installation scripts and documentation

#### 🚀 Version Management
- **Fixed Version Display**: Corrected version reading logic to show actual package version
- **Updated Default Version**: Synchronized default version with package.json

---

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
