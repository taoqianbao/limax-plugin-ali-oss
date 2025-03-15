/**
 * PeterZhu@limax
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import OSS from 'ali-oss';
import { getOSSConfig } from './ossconfig';
import { resolveImagePath, generateImageSearchPattern, replaceImagePath } from './imagePathResolver';
import { getOutputChannel } from './outputChannel';

export function activate(context: vscode.ExtensionContext) {
  // 获取全局输出面板
  const outputChannel = getOutputChannel();

  // 注册单个图片上传命令
  const uploadSingleDisposable = vscode.commands.registerCommand('limax-plugin-ali-oss.uploadToOSS', async () => {
    try {
      outputChannel.appendLine('开始执行单个图片上传...');
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        outputChannel.appendLine('错误：未在编辑器中打开文件');
        vscode.window.showErrorMessage('请在编辑器中打开文件');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        outputChannel.appendLine('错误：未在工作区中打开项目');
        vscode.window.showErrorMessage('请在工作区中打开项目');
        return;
      }

      outputChannel.appendLine(`工作区路径: ${workspaceFolder.uri.fsPath}`);

      // 检查 src 目录是否存在
      const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');
      if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isDirectory()) {
        outputChannel.appendLine(`错误：src 目录不存在 - ${srcPath}`);
        vscode.window.showErrorMessage('所选目录下没有找到 src 目录');
        return;
      }
      outputChannel.appendLine(`src 目录路径: ${srcPath}`);

      // 获取配置
      const config = await getOSSConfig(workspaceFolder.uri.fsPath);
      outputChannel.appendLine('已加载 OSS 配置');

      const { accessKeyId, accessKeySecret, bucket, region, uploadPath } = config;

      if (!accessKeyId || !accessKeySecret || !bucket) {
        outputChannel.appendLine('错误：OSS 配置信息不完整');
        vscode.window.showErrorMessage('请先配置阿里云 OSS 信息');
        return;
      }

      // 获取当前选中的文本
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      // 解析图片路径
      const imageInfo = resolveImagePath(text, workspaceFolder, editor.document.uri.fsPath);
      if (!imageInfo) {
        outputChannel.appendLine('错误：无效的图片路径:' + imageInfo);
        vscode.window.showErrorMessage('请选择包含有效的图片路径的文本');
        return;
      }
      outputChannel.appendLine(`图片信息: ${JSON.stringify(imageInfo)}`);

      // 创建 OSS 客户端
      const client = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket
      });

      // 生成 OSS 路径，保持原有目录结构
      let relativePath = path.relative(path.join(workspaceFolder.uri.fsPath, 'src'), path.dirname(imageInfo.fullPath));
      // 如果是别名路径（以@开头），则从第一个/之后的路径开始使用
      if (imageInfo.originalPath.startsWith('@')) {
        const pathParts = imageInfo.originalPath.split('/');
        pathParts.shift(); // 移除@开头的部分（如@assets、@static等）
        relativePath = pathParts.slice(0, -1).join('/');
      } else if (imageInfo.originalPath.startsWith('/static/')) {
        // 如果路径以/static/开头，移除/static前缀
        relativePath = imageInfo.originalPath.slice(7); // 移除'/static/'
        relativePath = path.dirname(relativePath); // 获取目录部分
      }
      const ossPath = path.posix.join(uploadPath || 'images', relativePath, imageInfo.fileName);

      // 上传文件
      outputChannel.appendLine(`开始上传文件: ${imageInfo.fileName}`);
      await client.put(ossPath, imageInfo.fullPath);
      outputChannel.appendLine(`文件上传成功: ${ossPath}`);

      // 获取文件 URL
      const url = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;
      outputChannel.appendLine(`生成的 OSS URL: ${url}`);

      // 替换文本
      await editor.edit(editBuilder => {
        editBuilder.replace(selection, replaceImagePath(text, imageInfo.originalPath, url));
      });

      vscode.window.showInformationMessage('图片上传成功');
      outputChannel.appendLine('图片上传和替换操作完成');
    } catch (error) {
      outputChannel.appendLine(`错误: ${error instanceof Error ? error.message : String(error)}`);
      vscode.window.showErrorMessage(`上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 注册批量上传命令
  const uploadBatchDisposable = vscode.commands.registerCommand('limax-plugin-ali-oss.uploadBatchToOSS', async (uri: vscode.Uri) => {
    try {
      const outputChannel = getOutputChannel();
      outputChannel.appendLine('开始执行批量上传...');
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        outputChannel.appendLine('错误：未在工作区中打开项目');
        vscode.window.showErrorMessage('请在工作区中打开项目');
        return;
      }

      // 获取选中的目录路径
      const selectedPath = uri.fsPath;
      outputChannel.appendLine(`选中的目录路径: ${selectedPath}`);
      if (!fs.existsSync(selectedPath) || !fs.statSync(selectedPath).isDirectory()) {
        outputChannel.appendLine('错误：选中的路径不是有效的目录');
        vscode.window.showErrorMessage('请选择一个有效的目录');
        return;
      }

      // 获取配置
      const config = await getOSSConfig(workspaceFolder.uri.fsPath);
      outputChannel.appendLine('已加载 OSS 配置');

      const { accessKeyId, accessKeySecret, bucket, region, uploadPath } = config;

      if (!accessKeyId || !accessKeySecret || !bucket) {
        outputChannel.appendLine('错误：OSS 配置信息不完整');
        vscode.window.showErrorMessage('请先配置阿里云 OSS 信息');
        return;
      } else {
        outputChannel.appendLine('OSS 配置信息完整');
      }

      // 创建 OSS 客户端
      const client = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket
      });
      outputChannel.appendLine('OSS 客户端初始化成功');

      // 递归获取文件夹中的所有图片文件，同时保持目录结构
      const imageFiles: { path: string; relativePath: string }[] = [];
      const walkDir = (dir: string, base: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath, base);
          } else {
            // 计算相对路径，从static目录开始
            const staticPath = path.join(workspaceFolder.uri.fsPath, 'src', 'static');
            let relativePath;

            if (filePath.startsWith(staticPath)) {
              // 如果文件在static目录下，获取static下级目录的路径
              const pathParts = path.relative(staticPath, filePath).split(path.sep);
              // 如果有下级目录，则从第一个目录开始使用
              relativePath = pathParts.join('/');
            } else {
              // 否则使用相对于选中目录的路径
              relativePath = path.relative(base, filePath);
            }

            imageFiles.push({
              path: filePath,
              relativePath: relativePath
            });
            outputChannel.appendLine(`找到文件: ${relativePath}`);
          }
        }
      };

      outputChannel.appendLine('开始扫描目录...');
      walkDir(selectedPath, selectedPath);
      outputChannel.appendLine(`扫描完成，共找到 ${imageFiles.length} 个文件`);

      if (imageFiles.length === 0) {
        outputChannel.appendLine('错误：所选文件夹中没有找到文件');
        vscode.window.showInformationMessage('所选文件夹中没有找到文件');
        return;
      }

      // 开始上传
      const progress = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在上传文件...',
        cancellable: false
      }, async (progress) => {
        const total = imageFiles.length;
        let current = 0;
        let successCount = 0;

        outputChannel.appendLine('开始上传文件...');
        // 批量处理图片上传
        for (const imageFile of imageFiles) {
          const ossPath = path.posix.join(uploadPath || 'images', imageFile.relativePath.split(path.sep).join('/'));
          outputChannel.appendLine(`正在上传: ${imageFile.relativePath}`);
          outputChannel.appendLine(`OSS 目标路径: ${ossPath}`);

          try {
            // 上传文件到 OSS，保持目录结构
            await client.put(ossPath, imageFile.path);
            const ossUrl = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;
            outputChannel.appendLine(`上传成功: ${ossUrl}`);

            current++;
            successCount++;
            progress.report({ increment: (100 / total), message: `已上传 ${current}/${total}` });
          } catch (error) {
            outputChannel.appendLine(`上传失败: ${imageFile.relativePath}`);
            outputChannel.appendLine(`错误信息: ${error instanceof Error ? error.message : String(error)}`);
            console.error(`上传 ${imageFile.relativePath} 失败:`, error);
            vscode.window.showErrorMessage(`上传 ${imageFile.relativePath} 失败: ${error instanceof Error ? error.message : String(error)}`);
            current++;
          }
        }

        outputChannel.appendLine(`上传完成，成功: ${successCount}个，失败: ${total - successCount}个`);
        return successCount;
      });

      vscode.window.showInformationMessage(`批量上传完成，成功上传 ${progress} 个文件`);
    } catch (error) {
      outputChannel.appendLine(`批量上传过程出错: ${error instanceof Error ? error.message : String(error)}`);
      vscode.window.showErrorMessage(`批量上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(uploadSingleDisposable, uploadBatchDisposable);
}

export function deactivate() { }
