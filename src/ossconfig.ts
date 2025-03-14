/**
 * PeterZhu@limax
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface OSSConfig {
  accessKeyId?: string;
  accessKeySecret?: string;
  bucket?: string;
  region?: string;
  uploadPath?: string;
}

// 存储配置文件监听器
let configWatcher: fs.FSWatcher | null = null;

// 从配置文件读取 OSS 配置
export async function loadOSSConfig(workspaceFolder: string): Promise<OSSConfig | null> {
  const outputChannel = vscode.window.createOutputChannel('Limax Plugin Ali OSS');
  const configPath = path.join(workspaceFolder, 'oss.config.limax.js');
  
  outputChannel.appendLine(`尝试从配置文件加载 OSS 配置: ${configPath}`);
  
  try {
    if (fs.existsSync(configPath)) {
      outputChannel.appendLine('配置文件存在，开始读取...');
      // 清除 require 缓存，确保每次都读取最新的配置
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      outputChannel.appendLine('配置文件加载成功');
      return config;
    } else {
      outputChannel.appendLine('配置文件不存在');
    }
  } catch (error) {
    outputChannel.appendLine(`读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
    console.error('读取配置文件失败:', error);
  }
  
  return null;
}

// 获取 OSS 配置
export async function getOSSConfig(workspaceFolder: string): Promise<OSSConfig> {
  const outputChannel = vscode.window.createOutputChannel('Limax Plugin Ali OSS');
  let config: OSSConfig = {};
  const fileConfig = await loadOSSConfig(workspaceFolder);
  
  if (fileConfig) {
    outputChannel.appendLine('使用配置文件中的设置');
    config = fileConfig;

    // 设置配置文件监听
    const configPath = path.join(workspaceFolder, 'oss.config.limax.js');
    if (!configWatcher) {
      configWatcher = fs.watch(configPath, (eventType) => {
        if (eventType === 'change') {
          outputChannel.appendLine('检测到配置文件变更，正在重新加载...');
          // 触发配置更新事件
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
      outputChannel.appendLine('已启动配置文件监听');
    }
  } else {
    outputChannel.appendLine('使用 VSCode 设置');
    const vsConfig = vscode.workspace.getConfiguration('limax-plugin-ali-oss');
    config = {
      accessKeyId: vsConfig.get<string>('accessKeyId'),
      accessKeySecret: vsConfig.get<string>('accessKeySecret'),
      bucket: vsConfig.get<string>('bucket'),
      region: vsConfig.get<string>('region'),
      uploadPath: vsConfig.get<string>('uploadPath')
    };
  }

  // 验证配置完整性
  const missingFields = [];
  if (!config.accessKeyId) missingFields.push('accessKeyId');
  if (!config.accessKeySecret) missingFields.push('accessKeySecret');
  if (!config.bucket) missingFields.push('bucket');
  if (!config.region) missingFields.push('region');
  if (!config.uploadPath) missingFields.push('uploadPath');

  if (missingFields.length > 0) {
    outputChannel.appendLine(`配置不完整，缺少以下字段: ${missingFields.join(', ')}`);
  } else {
    outputChannel.appendLine('配置验证通过');
  }

  return config;
}

// 清理配置文件监听器
export function disposeConfigWatcher() {
  if (configWatcher) {
    configWatcher.close();
    configWatcher = null;
  }
}