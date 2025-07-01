# WordHandbook

## 1 Brief Introduction

这是一个科研生词本,将你在科研中遇到的单词进行积累,方便进行英文写作的时候查阅。
借鉴 native speaker 的词汇有时候可能比用 ai 或者翻译工具的得来的更原汁原味

## 2 Project Structure

```
wordbook-app/
├── main.js # 主进程
├── preload.js # 安全通信桥
├── renderer/
│ ├── input.html # 输入窗口页面
│ ├── display.html # 展示窗口页面
│ └── script.js # 渲染进程 JS
├── db.js # 数据库封装
├── package.json
└── assets/
```
