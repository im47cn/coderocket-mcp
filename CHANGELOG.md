# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
