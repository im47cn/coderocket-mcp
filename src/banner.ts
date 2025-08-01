/**
 * CodeRocket MCP Banner Display
 * 精美的 ASCII Art Banner 显示，参考 coderocket-cli 的设计
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI 颜色代码
const colors = {
  // 基础颜色
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  PURPLE: '\x1b[0;35m',
  CYAN: '\x1b[0;36m',
  WHITE: '\x1b[1;37m',
  BOLD: '\x1b[1m',
  GRAY: '\x1b[0;37m',
  NC: '\x1b[0m', // No Color
  
  // 渐变色（256色模式）
  GRAD_1: '\x1b[38;5;39m',   // 亮蓝色
  GRAD_2: '\x1b[38;5;45m',   // 青蓝色
  GRAD_3: '\x1b[38;5;51m',   // 青色
  GRAD_4: '\x1b[38;5;87m',   // 浅青色
  GRAD_5: '\x1b[38;5;123m',  // 浅蓝绿色
  GRAD_6: '\x1b[38;5;159m',  // 很浅的青色
};

/**
 * 获取终端宽度
 */
function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * 获取版本信息
 */
function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packagePath = resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || '1.2.4';
  } catch {
    return '1.2.4'; // Fallback
  }
}

/**
 * 显示长版本 Banner（宽终端使用）
 */
function showLongBanner(): void {
  console.log('');
  console.log(`${colors.GRAD_1} ███            ██████  ██████  ██████  ███████ ██████   ██████   ██████ ██   ██ ███████ ████████ ${colors.NC}`);
  console.log(`${colors.GRAD_2}░░░███         ██      ██    ██ ██   ██ ██      ██   ██ ██    ██ ██      ██  ██  ██         ██    ${colors.NC}`);
  console.log(`${colors.GRAD_3}  ░░░███       ██      ██    ██ ██   ██ █████   ██████  ██    ██ ██      █████   █████      ██    ${colors.NC}`);
  console.log(`${colors.GRAD_4}    ░░░███     ██      ██    ██ ██   ██ ██      ██   ██ ██    ██ ██      ██  ██  ██         ██    ${colors.NC}`);
  console.log(`${colors.GRAD_5}     ███░       ██████  ██████  ██████  ███████ ██   ██  ██████   ██████ ██   ██ ███████    ██    ${colors.NC}`);
  console.log(`${colors.GRAD_6}   ███░                                                                                            ${colors.NC}`);
  console.log(`${colors.GRAD_1} ███░                                                                                              ${colors.NC}`);
  console.log(`${colors.GRAD_2}░░░                                                                                                ${colors.NC}`);
  console.log('');

  // 版本和服务信息
  const version = getVersion();
  console.log(`${colors.GRAD_5}🚀 AI 驱动的代码审查 MCP 服务器${colors.NC}`);
  console.log(`${colors.GRAY}版本: v${version}${colors.NC}`);
  console.log(`${colors.GRAY}协议: Model Context Protocol (MCP)${colors.NC}`);
  console.log('');
}

/**
 * 显示短版本 Banner（窄终端使用）
 */
function showShortBanner(): void {
  console.log('');
  console.log(`${colors.GRAD_1} ██████  ██████  ██████  ███████ ██████   ██████   ██████ ██   ██ ███████ ████████ ${colors.NC}`);
  console.log(`${colors.GRAD_2}██      ██    ██ ██   ██ ██      ██   ██ ██    ██ ██      ██  ██  ██         ██    ${colors.NC}`);
  console.log(`${colors.GRAD_3}██      ██    ██ ██   ██ █████   ██████  ██    ██ ██      █████   █████      ██    ${colors.NC}`);
  console.log(`${colors.GRAD_4}██      ██    ██ ██   ██ ██      ██   ██ ██    ██ ██      ██  ██  ██         ██    ${colors.NC}`);
  console.log(`${colors.GRAD_5} ██████  ██████  ██████  ███████ ██   ██  ██████   ██████ ██   ██ ███████    ██    ${colors.NC}`);
  console.log('');

  // 版本和服务信息
  const version = getVersion();
  console.log(`${colors.GRAD_5}🚀 AI 驱动的代码审查 MCP 服务器${colors.NC}`);
  console.log(`${colors.GRAY}版本: v${version}${colors.NC}`);
  console.log(`${colors.GRAY}协议: Model Context Protocol (MCP)${colors.NC}`);
  console.log('');
}

/**
 * 显示迷你 Banner（单行显示）
 */
function showMiniBanner(): void {
  const version = getVersion();
  console.log(`${colors.GRAD_3}CodeRocket MCP v${version} 🚀 - AI 驱动的代码审查服务器${colors.NC}`);
}

/**
 * 显示主 Banner（根据终端宽度自适应）
 */
function showBanner(): void {
  const width = getTerminalWidth();
  
  if (width >= 100) {
    showLongBanner();
  } else {
    showShortBanner();
  }
}

/**
 * 显示启动信息
 */
function showStartupInfo(): void {
  showBanner();
  console.log(`${colors.YELLOW}💡 MCP 服务器信息：${colors.NC}`);
  console.log(`${colors.WHITE}  • 支持自动Git变更审查 (review_changes)${colors.NC}`);
  console.log(`${colors.WHITE}  • 支持代码片段审查 (review_code)${colors.NC}`);
  console.log(`${colors.WHITE}  • 支持Git提交审查 (review_commit)${colors.NC}`);
  console.log(`${colors.WHITE}  • 支持多文件批量审查 (review_files)${colors.NC}`);
  console.log('');
}

/**
 * 显示成功 Banner
 */
function showSuccessBanner(message: string): void {
  console.log(`${colors.GREEN}${colors.BOLD}✅ CodeRocket MCP${colors.NC}`);
  console.log(`${colors.GREEN}${message}${colors.NC}`);
  console.log('');
}

/**
 * 显示错误 Banner
 */
function showErrorBanner(message: string): void {
  console.log(`${colors.RED}${colors.BOLD}❌ CodeRocket MCP 错误${colors.NC}`);
  console.log(`${colors.RED}${message}${colors.NC}`);
  console.log('');
}

export {
  showBanner,
  showMiniBanner,
  showStartupInfo,
  showSuccessBanner,
  showErrorBanner,
  showLongBanner,
  showShortBanner,
  getVersion,
  colors,
};
