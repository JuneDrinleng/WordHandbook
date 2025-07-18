# Phd Assistant

## 1 Brief Introduction

这是一个科研生词本,将你在科研中遇到的单词进行积累,方便进行英文写作的时候查阅。

借鉴 native speaker 的词汇有时候可能比用 ai 或者翻译工具的得来的更原汁原味

## 2 Overview
多种工具任君使用：  

<img width="273" height="379" alt="image" src="https://github.com/user-attachments/assets/2483814b-d4b5-4aa8-92d0-1f4acb8a7c34" style="zoom:50%;"/>

### 2.1 单词本功能：
快速检索的单词本，方便的实现添加生词，可以直接以 csv 格式导入和导出。

<img src="./README.assets/image-20250701134726240.png" alt="image-20250701134726240" style="zoom:50%;" />  

注意，离线版本只有1.0.0版本可行，后续的所有版本都需要在服务器端配置数据库

### 2.2 番茄钟专注
可以设置今日待办，自动统计最近常用的专注任务方便快速开始专注
<div style="display: flex; justify-content: space-around;">
  <img src="https://github.com/user-attachments/assets/ad9c7f3a-90cb-4791-9d62-2191083cc7a4" alt="图1" style="width: 45%; margin-right: 10px;">
  <img src="https://github.com/user-attachments/assets/a3d788a6-0a92-4888-9bb2-539db96e2ca1" alt="图2" style="width: 45%;">
</div>
对于专注时长会自动统计，包括日、周、月三个时间范围，同时专注记录也提供修改的界面：
<div style="display: flex; justify-content: space-around;">
  <img width="879" height="1576" alt="image" src="https://github.com/user-attachments/assets/2f2b0671-f74c-4e62-88d0-06fedbda1963" alt="图1" style="width: 45%; margin-right: 10px;" />
  <img width="879" height="1576" alt="image" src="https://github.com/user-attachments/assets/1e463a09-14c6-4317-bb84-b1ee7cc49cd8" alt="图2" style="width: 45%;" />
</div>
### 2.3 电量查询
在设置页输入清华家园网的账号和密码后，便可以查询电量，根据电量情况，页面会从绿色变成黄色最后变为红色：
<img width="2002" height="1483" alt="image" src="https://github.com/user-attachments/assets/27eb280b-bc99-48e9-b391-7eec09fc3b46" />


# 3 Server setting

```
apt update
apt install -y postgresql-17 postgresql-client-17
systemctl enable --now postgresql
sudo -u postgres psql <<'SQL'
CREATE DATABASE wordbook;
CREATE ROLE worduser WITH LOGIN PASSWORD 'YOURPASSWORD';
GRANT ALL PRIVILEGES ON DATABASE wordbook TO worduser;
SQL

sudo mkdir -p /srv/wordbook-api && sudo chown $USER:$USER /srv/wordbook-api
ls
cd /srv/wordbook-api
npm init -y
npm i express pg dotenv cors
ls
sudo -u postgres psql wordbook <<'SQL'
CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  en TEXT UNIQUE NOT NULL,
  zh TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
SQL

node src/index.js
pm2 start src/index.js --name wordbook-api --env production
pm2 save
pm2 list
curl -X POST http://localhost:3000/words      -H 'Content-Type: application/json'      -d '{"en":"hello","zh":"你好"}'
sudo -u postgres psql wordbook
ls -a
cd /srv
ls
cd wordbook-api
ls -a
curl -X POST http://localhost:3000/words      -H 'Content-Type: application/json'      -d '{"en":"hello","zh":"你好"}'
curl http://localhost:3000/words
```

请在 `/srv/wordbook-api` 下创建 `.env` 文件，内容如下：

```
DATABASE_URL=postgresql://worduser:YOURPASSWORD@localhost:5432/wordbook
PORT=3000
API_TOKEN=your-secret-token
ELEC_USER=你的清华学号
ELEC_PASS=你的密码
```

然后再配置 nginx 和 cf 的代理即可

## 4 Project Structure

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

## 5 build

```
npm run dist
```
