# 阿里云 OSS 图片上传插件

这是一个用于将图片快速上传到阿里云 OSS 的 VSCode 插件。通过简单的右键菜单操作，你可以将代码中的本地图片路径自动上传并替换为 OSS 的访问地址。

## 环境要求

- Node.js v20 或更高版本
- Visual Studio Code v1.78.2 或更高版本

## 功能特点

- 支持在编辑器中选中图片路径，右键上传到阿里云 OSS
- 自动替换本地路径为 OSS 访问地址
- 支持多种图片格式：png、jpg、jpeg、gif、webp
- 支持相对路径和绝对路径的图片
- 适用于 JavaScript、TypeScript、Vue、React、HTML、CSS 等多种文件类型

## 使用方法

1. 在 VSCode 中打开包含图片路径的代码文件
2. 选中包含图片路径的文本（如：'./images/example.png'）
3. 右键点击，选择「上传到阿里云 OSS」
4. 图片将被上传到 OSS，并且路径会被自动替换为 OSS 的访问地址

## 配置说明

在使用插件之前，需要先配置阿里云 OSS 的相关信息：

* `limax-plugin-ali-oss.accessKeyId`: 阿里云 AccessKey ID
* `limax-plugin-ali-oss.accessKeySecret`: 阿里云 AccessKey Secret
* `limax-plugin-ali-oss.bucket`: OSS Bucket 名称
* `limax-plugin-ali-oss.region`: OSS Region 地域（默认：oss-cn-hangzhou）
* `limax-plugin-ali-oss.uploadPath`: OSS 上传目录（默认：images）

你可以通过 VSCode 的设置界面或者 settings.json 文件来配置这些选项。

## 版本记录

### 0.0.1

- 初始版本发布
- 支持图片上传到阿里云 OSS
- 支持自动替换图片路径

## 打包方案

通过手动打包的方式来创建 VSIX 文件。具体步骤如下：

1. 确保 Node.js 版本 >= v20
2. 确保项目已经通过`pnpm run compile` 正确编译，生成了 out 目录
3. 进入项目根目录（limax-plugin-ali-oss/）
4. 使用 zip 命令将必要的文件打包成 VSIX 格式：
   - package.json（插件配置文件）
   - README.md（说明文档）
   - CHANGELOG.md（更新日志）
   - out/（编译后的代码）
   - images/（图标等资源文件）

```bash
vsce login limax
vsce package
vsce publish
```

https://marketplace.visualstudio.com/manage/publishers/peterzhu

https://marketplace.visualstudio.com/items?itemName=PeterZhu.limax-plugin-ali-oss

注意：所有文件必须在根目录下打包，不要包含额外的目录层级。使用以下命令打包：

```bash
zip -r limax-plugin-ali-oss.vsix package.json README.md CHANGELOG.md out/
```

这样就可以得到一个有效的 VSIX 插件包，可以用于分发或上传到 VSCode 插件市场。