#!/bin/bash

# CodeRocket MCP 发布准备脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 准备发布 CodeRocket MCP...${NC}"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：请在coderocket-mcp目录中运行此脚本${NC}"
    exit 1
fi

# 检查Git状态
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  警告：工作目录有未提交的更改${NC}"
    echo "请先提交所有更改后再发布"
    git status --short
    exit 1
fi

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  警告：当前不在主分支 (当前: $CURRENT_BRANCH)${NC}"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📋 当前版本: $CURRENT_VERSION${NC}"

# 询问新版本
echo ""
echo "选择版本类型："
echo "1) patch (修复版本): $CURRENT_VERSION -> 修复版本"
echo "2) minor (功能版本): $CURRENT_VERSION -> 功能版本"
echo "3) major (重大版本): $CURRENT_VERSION -> 重大版本"
echo "4) 自定义版本"
echo ""

read -p "请选择 (1-4): " CHOICE
echo ""

case $CHOICE in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "请输入版本号 (例如: 1.2.3): " CUSTOM_VERSION
        if [[ ! $CUSTOM_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${RED}❌ 错误：版本号格式不正确${NC}"
            exit 1
        fi
        VERSION_TYPE=$CUSTOM_VERSION
        ;;
    "")
        echo -e "${RED}❌ 错误：请选择一个选项${NC}"
        exit 1
        ;;
    *)
        echo -e "${RED}❌ 错误：无效选择 '$CHOICE'${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}🔍 运行预发布检查...${NC}"

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 代码检查（跳过，因为需要额外的TypeScript ESLint配置）
echo "🔍 代码检查..."
echo "⚠️  跳过ESLint检查（需要完整的TypeScript ESLint配置）"

# 构建项目
echo "🔨 构建项目..."
npm run build

# 运行测试
echo "🧪 运行测试..."
npm test

echo -e "${GREEN}✅ 所有检查通过！${NC}"
echo ""

# 确认发布
NEW_VERSION=$(npm version $VERSION_TYPE --dry-run | cut -d'v' -f2)
echo -e "${YELLOW}📋 准备发布版本: $NEW_VERSION${NC}"
echo ""
echo "发布内容预览："
echo "- 包名: @yeepay/coderocket-mcp"
echo "- 版本: $NEW_VERSION"
echo "- 描述: $(node -p "require('./package.json').description")"
echo "- 主要文件: dist/, bin/, README.md, package.json"
echo ""

read -p "确认发布到npm？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ 发布已取消${NC}"
    exit 0
fi

echo -e "${BLUE}🚀 开始发布...${NC}"

# 更新版本号
npm version $VERSION_TYPE

# 发布到npm
npm publish

echo ""
echo -e "${GREEN}🎉 发布成功！${NC}"
echo ""
echo "📋 发布信息："
echo "- 包名: @yeepay/coderocket-mcp"
echo "- 版本: $NEW_VERSION"
echo "- npm链接: https://www.npmjs.com/package/@yeepay/coderocket-mcp"
echo ""
echo "📖 用户现在可以通过以下命令安装和使用："
echo "  npm install -g @yeepay/coderocket-mcp"
echo "  npx -y @yeepay/coderocket-mcp --version"
echo ""
echo "🔗 下一步："
echo "1. 更新项目文档"
echo "2. 发布Release Notes"
echo "3. 通知用户更新"
echo ""
