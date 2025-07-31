#!/bin/bash

# CodeRocket MCP 安装脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    CodeRocket MCP                            ║"
    echo "║              AI驱动的代码审查MCP服务器                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查Node.js版本
check_nodejs() {
    echo -e "${BLUE}🔍 检查Node.js环境...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ 错误：未找到Node.js${NC}"
        echo "请先安装Node.js (>= 18.0.0): https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).reduce((a,b,i)=>a+b*Math.pow(1000,2-i),0) >= '$REQUIRED_VERSION'.split('.').map(Number).reduce((a,b,i)=>a+b*Math.pow(1000,2-i),0) ? 0 : 1)"; then
        echo -e "${RED}❌ 错误：Node.js版本过低 (当前: v$NODE_VERSION, 需要: >= v$REQUIRED_VERSION)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js版本检查通过 (v$NODE_VERSION)${NC}"
}

# 检查CodeRocket-CLI
check_coderocket_cli() {
    echo -e "${BLUE}🔍 检查CodeRocket-CLI...${NC}"
    
    # 检查可能的安装路径
    CODEROCKET_PATHS=(
        "../coderocket-cli"
        "../../coderocket-cli"
        "$HOME/.coderocket"
        "$HOME/.codereview-cli"
        "/usr/local/share/coderocket-cli"
    )
    
    FOUND_PATH=""
    for path in "${CODEROCKET_PATHS[@]}"; do
        if [ -f "$path/lib/ai-service-manager.sh" ]; then
            FOUND_PATH="$path"
            break
        fi
    done
    
    if [ -z "$FOUND_PATH" ]; then
        echo -e "${YELLOW}⚠️  警告：未找到CodeRocket-CLI${NC}"
        echo "请确保CodeRocket-CLI已正确安装"
        echo "安装方法: https://github.com/im47cn/coderocket-cli"
        echo ""
        read -p "是否继续安装？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 找到CodeRocket-CLI: $FOUND_PATH${NC}"
    fi
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}📦 安装依赖包...${NC}"
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 构建项目
build_project() {
    echo -e "${BLUE}🔨 构建项目...${NC}"
    
    npm run build
    
    echo -e "${GREEN}✅ 项目构建完成${NC}"
}

# 运行测试
run_tests() {
    echo -e "${BLUE}🧪 运行测试...${NC}"
    
    if npm run test; then
        echo -e "${GREEN}✅ 测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  测试失败，但不影响安装${NC}"
    fi
}

# 设置可执行权限
setup_permissions() {
    echo -e "${BLUE}🔧 设置权限...${NC}"
    
    chmod +x bin/coderocket-mcp
    
    echo -e "${GREEN}✅ 权限设置完成${NC}"
}

# 显示安装完成信息
show_completion() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   🎉 安装完成！                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "📋 使用方法："
    echo ""
    echo "  启动MCP服务器:"
    echo "    npm start"
    echo "    # 或"
    echo "    ./bin/coderocket-mcp start"
    echo ""
    echo "  运行测试:"
    echo "    npm run test"
    echo "    # 或"
    echo "    ./bin/coderocket-mcp test"
    echo ""
    echo "  查看帮助:"
    echo "    ./bin/coderocket-mcp help"
    echo ""
    echo "📖 配置AI服务："
    echo "  请确保至少配置一个AI服务："
    echo "    - Gemini: npm install -g @google/gemini-cli && gemini config"
    echo "    - OpenCode: npm install -g @opencode/cli && opencode config"
    echo "    - ClaudeCode: npm install -g @anthropic-ai/claude-code && claudecode config"
    echo ""
    echo "🔗 更多信息："
    echo "  - 文档: README.md"
    echo "  - 项目主页: https://github.com/im47cn/coderocket-cli"
    echo ""
}

# 主安装流程
main() {
    show_banner
    
    echo -e "${BLUE}开始安装 CodeRocket MCP...${NC}"
    echo ""
    
    check_nodejs
    check_coderocket_cli
    install_dependencies
    build_project
    setup_permissions
    run_tests
    
    echo ""
    show_completion
}

# 运行安装
main "$@"
