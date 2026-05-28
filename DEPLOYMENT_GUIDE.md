# 📦 StoryShare 部署指南

## 架构说明

```
用户 → Cloudflare Pages (前端托管) → Cloudflare Functions (API 代理) → 阿里云 ECS (后端 + MySQL)
      https://storyshare.pages.dev         /api/* 自动拦截               http://39.107.247.51:3000
```

---

## 一、阿里云后端部署

### 1. 上传后端代码到阿里云 ECS

```bash
# 在本地项目根目录执行（确保已安装 rsync）
rsync -avz --exclude 'node_modules' --exclude '.git' ./backend/ root@39.107.247.51:/opt/storyshare/backend/

# 或者通过 Git 拉取
ssh root@39.107.247.51
cd /opt/storyshare
git clone https://github.com/fugufog/storyshare.git .
```

### 2. 阿里云 ECS 环境配置

```bash
ssh root@39.107.247.51

# 安装 Node.js 18+（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装依赖
cd /opt/storyshare/backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，确保以下内容正确：
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=storyshare
# DB_PASSWORD=你的数据库密码
# DB_NAME=storyshare
# JWT_SECRET=你的JWT密钥
# PORT=3000
```

### 3. 阿里云 MySQL 配置

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS storyshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据库结构
mysql -u root -p storyshare < /opt/storyshare/backend/database/init.sql

# 创建用户并授权
CREATE USER IF NOT EXISTS 'storyshare'@'localhost' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON storyshare.* TO 'storyshare'@'localhost';
FLUSH PRIVILEGES;
```

### 4. 阿里云安全组配置（❗重要❗）

登录阿里云控制台 → ECS → 安全组 → 配置规则：

| 方向 | 端口 | 协议 | 授权对象 | 说明 |
|------|------|------|----------|------|
| 入方向 | 3000 | TCP | 0.0.0.0/0 | 后端 API 端口 |
| 入方向 | 22 | TCP | 0.0.0.0/0 | SSH（可选） |
| 入方向 | 3306 | TCP | 127.0.0.1/32 | MySQL（仅本地） |

### 5. 启动后端服务（使用 PM2 保活）

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd /opt/storyshare/backend
pm2 start server.js --name storyshare-backend

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
 

# 查看日志
pm2 logs storyshare-backend
```

### 6. 验证后端运行

```bash
# 在阿里云 ECS 上测试
curl http://localhost:3000/api/posts

# 从本地测试（确保安全组已开放 3000 端口）
curl http://39.107.247.51:3000/api/posts
```

---

## 二、Cloudflare Pages 部署

### 方式 A：通过 Wrangler CLI 部署（推荐）

```bash
# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 部署到 Cloudflare Pages
wrangler pages deploy frontend --project-name storyshare
```

### 方式 B：通过 Git 自动部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **创建应用程序** → **Pages**
3. 连接 GitHub 仓库 `fugufog/storyshare`
4. 配置构建设置：
   - **框架预设**：无
   - **构建命令**：（留空）
   - **构建输出目录**：`frontend`
   - **根目录**：（留空）

---

## 三、Cloudflare Pages 配置

### 构建设置
| 设置项 | 值 |
|--------|-----|
| 框架预设 | 无 |
| 构建命令 | 留空 |
| 构建输出目录 | `frontend` |
| 根目录 | 留空 |

### 环境变量（高级）
无需添加环境变量。Cloudflare Functions 硬编码了后端地址 `http://39.107.247.51:3000`。

---

## 四、验证部署

### 1. 测试前端
```
https://storyshare-你的项目名.pages.dev
```

### 2. 测试 API 代理
```
https://storyshare-你的项目名.pages.dev/api/posts
```

### 3. 测试登录
```
POST https://storyshare-你的项目名.pages.dev/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "你的密码"
}
```

---

## 五、常见问题排查

### 问题 1：Cloudflare Functions 代理失败（502 错误）
- 确认阿里云安全组已开放 3000 端口
- 确认后端 `pm2 status` 显示 `online`
- 在 ECS 上执行 `curl http://localhost:3000/api/posts` 确认本地可用

### 问题 2：CORS 错误
- 后端 `server.js` 中 CORS origin 已设为 `*`
- Cloudflare Functions 已自动添加 CORS headers
- 如果仍有问题，检查浏览器 Console 具体错误

### 问题 3：数据库连接失败
- 确认 `.env` 中数据库密码正确
- 执行 `mysql -u storyshare -p -h localhost storyshare` 测试连接
- 检查 MySQL 服务状态：`systemctl status mysql`

### 问题 4：404 Not Found
- 确认 Cloudflare Pages 输出目录设置为 `frontend`
- 确认 Functions 目录在 `frontend/functions/` 下
- 确认路径 `/api/*` 被 Functions 正确拦截

### 问题 5：前端 JS 加载失败
- 检查 `frontend/index.html` 中 JS 引用路径（确保是相对路径）
- 打开浏览器开发者工具 → Network 查看具体失败请求

---

## 六、文件结构总结

```
storyshare/
├── frontend/                    # Cloudflare Pages 部署目录
│   ├── index.html               # 主页面
│   ├── _headers                 # Cloudflare 安全头
│   ├── css/style.css            # 样式
│   ├── js/
│   │   ├── config.js            # API 配置
│   │   └── main.js              # 前端逻辑
│   └── functions/
│       └── api/
│           └── [[path]].js      # Cloudflare Functions 代理
├── backend/                     # 阿里云 ECS 部署目录
│   ├── server.js                # Express 主程序
│   ├── config/db.js             # 数据库连接
│   ├── database/init.sql        # 数据库初始化
│   ├── middleware/auth.js       # JWT 认证中间件
│   ├── routes/
│   │   ├── auth.js              # 认证路由
│   │   ├── posts.js             # 文章路由
│   │   └── admin.js             # 管理路由
│   ├── package.json
│   └── .env                     # 环境变量（不提交到 Git）
└── wrangler.toml                # Cloudflare 配置
