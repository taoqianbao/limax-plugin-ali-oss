# Change Log

All notable changes to the "limax-plugin-ali-oss" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.5] - 2025-03-15

- 优化图片路径处理逻辑
  - 支持处理以 @assets/ 等开头的别名路径
  - 优化 /static/ 前缀的路径处理
  - 保持原有目录结构上传到 OSS
  - 修复 Windows 系统下文件路径反斜杠的兼容性问题

## [0.0.4] - 2025-03-15

- 优化图片上传逻辑
- 支持以下文件格式：图片（png, jpg, jpeg, gif, webp）、字体（ttf, woff, woff2, eot）、样式文件（css, less, scss, sass）
- 改进错误处理和提示信息

## [0.0.1] - 2025-03-15

- 初始版本发布
- 支持图片上传到阿里云 OSS
- 支持自动替换图片路径