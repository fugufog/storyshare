# StoryShare 部署指南

## 架构说明

```
用户 → Cloudflare Pages (前端托管) → Cloudflare Functions (API 代理) → 阿里云 ECS (后端 + MySQL)
      https://storyshare.pages.dev         /api/* 自动拦截               http://39.107.247.51:3000
```

---

## 部署状态 ✅

| 组件 | 状态 | 详情 |
|------|:----:|------|
| 阿里云 RDS (MySQL) | ✅ | `storyshare` 库，表结构匹配代码 |
| 阿里云 ECS (后端 API) | ✅ | Node.js PM2 运行在 3000 端口 |
| firewalld 端口 | ✅ | 已开放 `3000/tcp` |
| 公网 API | ✅ | `curl http://39.107.247.51:3000/api/posts` 返回 JSON |
| Cloudflare Functions | ✅ | 代理 `/api/*` → ECS 后端 |
| Cloudflare Pages (前端) | ⚠️ | 需重新部署最新代码 |
| Git 仓库 | ✅ | `fugufog/storyshare` 代码已推送 |

---

## 验证命令

### API 正常响应确认（ECS 上执行）
```bash
curl -s "http://39.107.247.51:3000/api/posts?page=1&limit=3"
# 返回 JSON: {"posts":[...], "pagination":{...}}
```

### 端口监听确认
```bash
ss -tlnp | grep 3000
# LISTEN 0 511 *:3000
```

### 防火墙确认
```bash
firewall-cmd --list-ports
# 必须包含 3000/tcp
```

---

## 一、阿里云后端部署

### 1. 上传后端代码到阿里云 ECS

```bash
# 通过 Git 拉取
ssh root@39.107.247.51
cd /opt/storyshare
git pull origin main
cd backend && npm install
```

### 2. 阿里云 ECS 环境配置

```bash
ssh root@39.107.247.51

# 安装 Node.js 18+（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 配置环境变量（backend/.env）
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

# 导入数据库结构
mysql -u root -p storyshare < /opt/storyshare/backend/database/init.sql
```

### 4. 防火墙配置（❗重要❗）

```bash
# 开放 3000 端口
firewall-cmd --add-port=3000/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-ports  # 确认 3000/tcp 在列表中
```

### 5. 启动后端服务（使用 PM2 保活）

```bash
npm install -g pm2
cd /opt/storyshare/backend
pm2 start server.js --name storyshare-backend
pm2 startup && pm2 save
```

---

## 二、Cloudflare Pages 部署

### 方式 A：Git 自动部署（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Pages** → 连接 `fugufog/storyshare`
3. 构建设置：
   - **框架预设**：无
   - **构建命令**：留空
   - **构建输出目录**：`frontend`
4. 每次 `git push` 自动触发部署

### 方式 B：Wrangler CLI 手动部署

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy frontend --project-name storyshare
```

---

## 三、常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| Cloudflare 502 错误 | ECS 3000 端口未开放 | `firewall-cmd --add-port=3000/tcp --permanent && firewall-cmd --reload` |
| API 无响应 | PM2 进程挂了 | `pm2 restart storyshare-backend` |
| 数据库连接失败 | MySQL 密码错误或未启动 | `systemctl status mysqld` 检查 |
| CORS 错误 | 后端未允许跨域 | 已配置 `cors({ origin: '*' })` |
| 前端 JS 404 | Cloudflare Pages 未更新 | 在 Cloudflare 面板手动重部署 |

---

## 四、文件结构

```
storyshare/
├── frontend/                    # Cloudflare Pages 部署目录
│   ├── index.html               # 主页面
│   ├── _headers                 # Cloudflare 安全头 + CORS
│   ├── css/style.css            # 样式
│   ├── js/
│   │   ├── config.js            # API 配置（相对路径）
│   │   └── main.js              # 前端逻辑
│   └── functions/
│       └── api/
│           └── [[path]].js      # Cloudflare Functions 代理到 ECS
├── backend/                     # 阿里云 ECS 部署目录
│   ├── server.js                # Express 主程序 (端口 3000)
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
