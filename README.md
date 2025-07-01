# WordHandbook

## 1 Brief Introduction

这是一个科研生词本,将你在科研中遇到的单词进行积累,方便进行英文写作的时候查阅。

借鉴 native speaker 的词汇有时候可能比用 ai 或者翻译工具的得来的更原汁原味

## 2 Overview

快速检索的单词本，方便的实现添加生词，可以直接以csv格式导入和导出。

<img src="./README.assets/image-20250701134726240.png" alt="image-20250701134726240" style="zoom:50%;" />

# 3 Server setting

~~~
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
~~~

请在 `/srv/wordbook-api` 下创建 `.env` 文件，内容如下：
~~~
DATABASE_URL=postgresql://worduser:YOURPASSWORD@localhost:5432/wordbook
PORT=3000
API_TOKEN=your-secret-token
~~~

然后再配置nginx和cf的代理即可

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
