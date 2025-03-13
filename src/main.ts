/**
 * PeterZhu@limax
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import OSS from 'ali-oss';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('limax-plugin-ali-oss.uploadToOSS', async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('请在编辑器中打开文件');
        return;
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration('limax-plugin-ali-oss');
      const accessKeyId = config.get<string>('accessKeyId');
      const accessKeySecret = config.get<string>('accessKeySecret');
      const bucket = config.get<string>('bucket');
      const region = config.get<string>('region');
      const uploadPath = config.get<string>('uploadPath');

      if (!accessKeyId || !accessKeySecret || !bucket) {
        vscode.window.showErrorMessage('请先配置阿里云 OSS 信息');
        return;
      }

      // 获取当前选中的文本
      const selection = editor.selection;
      const text = editor.document.getText(selection);

      // 从文本中提取图片路径
      const imgPathMatch = text.match(/['"]([^'"]+\.(png|jpg|jpeg|gif|webp))['"]/);
      if (!imgPathMatch) {
        vscode.window.showErrorMessage('请选择包含图片路径的文本');
        return;
      }

      const imgPath = imgPathMatch[1];
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('请在工作区中打开项目');
        return;
      }

      // 获取图片的完整路径
      const fullImgPath = path.isAbsolute(imgPath)
        ? imgPath
        : path.resolve(path.dirname(editor.document.uri.fsPath), imgPath);

      // 检查文件是否存在
      if (!fs.existsSync(fullImgPath)) {
        vscode.window.showErrorMessage('图片文件不存在');
        return;
      }

      // 创建 OSS 客户端
      const client = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket
      });

      // 生成 OSS 路径
      const fileName = path.basename(fullImgPath);
      const ossPath = `${uploadPath}/${fileName}`;

      // 上传文件
      await client.put(ossPath, fullImgPath);

      // 获取文件 URL
      const url = `https://${bucket}.${region}.aliyuncs.com/${ossPath}`;

      // 替换文本
      await editor.edit(editBuilder => {
        editBuilder.replace(selection, text.replace(imgPath, url));
      });

      vscode.window.showInformationMessage('图片上传成功');
    } catch (error) {
      vscode.window.showErrorMessage(`上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
