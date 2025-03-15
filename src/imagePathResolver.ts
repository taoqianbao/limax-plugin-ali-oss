/**
 * PeterZhu@limax
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getOutputChannel } from './outputChannel';

export interface ImagePathInfo {
  fullPath: string;      // 图片的完整文件系统路径
  fileName: string;      // 图片文件名
  originalPath: string;  // 原始引用路径
}

// 支持的文件类型
const SUPPORTED_FILE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp','ttf', 'woff', 'woff2', 'eot','css', 'mp3', 'mp4', 'pdf'
];

/**
 * 解析图片路径，支持多种路径格式：
 * 1. 绝对路径
 * 2. 相对路径
 * 3. @/ 开头的路径（Vue/UniApp 项目的别名路径）
 * 4. @xxx/ 开头的路径（如 @static/、@assets/ 等）
 */
export function resolveImagePath(text: string, workspaceFolder: vscode.WorkspaceFolder, currentFilePath: string): ImagePathInfo | null {
  const outputChannel = getOutputChannel();
  outputChannel.appendLine('开始解析图片路径:');
  outputChannel.appendLine(`输入文本: ${text}`);
  outputChannel.appendLine(`工作区路径: ${workspaceFolder.uri.fsPath}`);
  outputChannel.appendLine(`当前文件路径: ${currentFilePath}`);

  try {
    // 从文本中提取图片路径，使用更精确的正则表达式
    // 定义各种路径格式的正则表达式
    // 定义独立的路径匹配模式
    // 定义支持的文件扩展名模式
    const extensionPattern = `${SUPPORTED_FILE_EXTENSIONS.join('|')}`;

    // 定义各种路径格式的正则表达式
    const patterns = [
      /^@\/[^\s"'<>|?*]+\.(png|jpg|jpeg|gif|webp|ttf|woff|woff2|eot|css|mp3|mp4|pdf)$/,  // @/开头的路径
      /^@[\w-]+\/[^\s"'<>|?*]+\.(png|jpg|jpeg|gif|webp|ttf|woff|woff2|eot|css|mp3|mp4|pdf)$/,  // @xxx/开头的路径
      /^\/[^\s"'<>|?*]+\.(png|jpg|jpeg|gif|webp|ttf|woff|woff2|eot|css|mp3|mp4|pdf)$/,  // 绝对路径
      /^\.[^\s"'<>|?*]+\.(png|jpg|jpeg|gif|webp|ttf|woff|woff2|eot|css|mp3|mp4|pdf)$/   // 相对路径
    ];

    // 构建正则表达式，移除^符号以增加灵活性
    const imgPathMatch = patterns.some(pattern => pattern.test(text)) ? text.match(/[^\s"'<>|?*]+\.(png|jpg|jpeg|gif|webp|ttf|woff|woff2|eot|css|mp3|mp4|pdf)/g) : null;

    if (!imgPathMatch) {
      outputChannel.appendLine('错误:未检测到有效的资源路径');
      return null;
    }

    outputChannel.appendLine(`检测到资源路径: ${imgPathMatch[0]}`);

    const imgPath = imgPathMatch[0];
    let fullImgPath = '';

    // 处理 @/ 开头的路径
    if (imgPath.startsWith('@/')) {
      fullImgPath = path.join(workspaceFolder.uri.fsPath, 'src', imgPath.slice(2));
      outputChannel.appendLine(`处理@/路径，解析为: ${fullImgPath}`);
    } else if (imgPath.match(/^@[^/]+\//)) {
      // 处理 @xxx/ 开头的路径（如 @static/、@assets/ 等）
      const aliasMatch = imgPath.match(/^@([\w-]+\/)(.*)/i);
      if (!aliasMatch) {
        outputChannel.appendLine('无效的别名路径格式');
        return null;
      }
      const [, aliasName, restPath] = aliasMatch;
      fullImgPath = path.join(workspaceFolder.uri.fsPath, 'src', aliasName.replace(/\//g, ''), restPath);
      outputChannel.appendLine(`处理@${aliasName}/路径，解析为: ${fullImgPath}`);
    } else if (path.isAbsolute(imgPath) || imgPath.startsWith('/')) {
      // 处理绝对路径，统一从 src 目录开始解析
      const relativePath = imgPath.startsWith('/') ? imgPath.slice(1) : path.relative('/', imgPath);
      fullImgPath = path.join(workspaceFolder.uri.fsPath, 'src', relativePath);
      outputChannel.appendLine(`处理绝对路径，解析为: ${fullImgPath}`);
    } else {
      // 处理相对路径
      fullImgPath = path.resolve(path.dirname(currentFilePath), imgPath);
      outputChannel.appendLine(`处理相对路径，解析为: ${fullImgPath}`);
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullImgPath)) {
      outputChannel.appendLine(`文件不存在: ${fullImgPath}`);
      return null;
    }

    outputChannel.appendLine(`文件存在: ${fullImgPath}`);

    const result: ImagePathInfo = {
      fullPath: fullImgPath,
      fileName: path.basename(fullImgPath),
      originalPath: imgPath
    };

    outputChannel.appendLine(`解析结果: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    outputChannel.appendLine(`解析过程出错: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * 生成用于搜索图片引用的正则表达式模式
 * @param relativePath - 相对路径
 * @param fileName - 文件名
 * @returns 用于搜索的正则表达式字符串
 */
export function generateImageSearchPattern(relativePath: string, fileName: string): string {
  const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\\/g, '/');
  return `['"](${escapedPath}|@/.*?/${fileName}|@.*?/${fileName})['"]`;
}

/**
 * 替换文本中的图片路径为 OSS URL
 * @param text - 原始文本
 * @param originalPath - 原始路径
 * @param ossUrl - OSS URL
 * @returns 替换后的文本
 */
export function replaceImagePath(text: string, originalPath: string, ossUrl: string): string {
  const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escapedPath, 'g'), ossUrl);
}