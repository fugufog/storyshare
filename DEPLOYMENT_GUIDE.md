# StoryShare 部署指南

## 架构说明

```
用户 → Cloudflare Pages (前端托管) → Cloudflare Functions (API 代理) → 阿里云 ECS Nginx (443) → Express (3000)
      https://storyshare.pages.dev         /api/* 自动拦截               https://api.fugufog.top      http://127.0.0.1:3000
```

> ⚠️ **已升级为 HTTPS 443 端口**：Nginx 作为反向代理，对外暴露标准 443 端口，避免非标准端口（3000）被网络环境拦截。


---

## 部署状态 ✅

| 组件 | 状态 | 详情 |
|------|:----:|------|
| 阿里云 RDS (MySQL) | ✅ | `storyshare` 库，表结构匹配代码 |
| 阿里云 ECS (后端 API) | ✅ | Node.js PM2 运行在 3000 端口 |
| firewalld 端口 | ✅ | 已开放 `443/tcp, 80/tcp` |
| Nginx 反向代理 | ⚠️ | 需配置 Nginx + SSL 证书 |
| 公网 API | ✅ | `curl https://api.fugufog.top/api/posts` 返回 JSON |
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
ss -tlnp | grep -E "3000|443|80"
# LISTEN 0 511 *:3000  (Express)
# LISTEN 0 511 *:443   (Nginx)
# LISTEN 0 511 *:80    (Nginx)
```

### 防火墙确认
```bash
firewall-cmd --list-ports
# 必须包含 443/tcp, 80/tcp
```

---

## 一、阿里云安全组配置（❗必须先做❗）

登录 [阿里云控制台](https://ecs.console.aliyun.com/) → ECS 实例 → 安全组 → 入方向规则：

| 协议 | 端口 | 授权来源 | 说明 |
|------|:----:|----------|------|
| TCP | 443 | 0.0.0.0/0 | HTTPS（Nginx） |
| TCP | 80 | 0.0.0.0/0 | HTTP（重定向到 HTTPS） |

> ⚠️ 可以移除原有的 3000 端口规则，Express 只需监听本地 `127.0.0.1:3000`。

---

## 二、阿里云 ECS 部署 Nginx + 后端

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
# 开放 443 和 80 端口
firewall-cmd --add-port=443/tcp --permanent
firewall-cmd --add-port=80/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-ports  # 确认 443/tcp, 80/tcp 在列表中
```

### 5. 安装并配置 Nginx 反向代理

```bash
# 安装 Nginx
yum install -y nginx   # CentOS/RHEL/Alibaba Cloud Linux
# 或
apt install -y nginx   # Ubuntu/Debian

# 创建 SSL 证书目录
mkdir -p /etc/nginx/ssl
```

#### 5a. 获取 Cloudflare Origin CA 证书（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 你的域名
2. **SSL/TLS** → **Origin Server** → **创建证书**
3. 选择"让 Cloudflare 生成私钥和 CSR"，有效期 15 年
4. 下载证书和私钥到 ECS：
   ```bash
   # 将 .pem 证书内容保存为：
   /etc/nginx/ssl/api.fugufog.top.pem
   
   # 将 .key 私钥内容保存为：
   /etc/nginx/ssl/api.fugufog.top.key
   
   # 设置权限
   chmod 600 /etc/nginx/ssl/*.key
   ```

5. Cloudflare SSL/TLS 加密模式设置为 **完全（严格）**

#### 5b. 配置 Nginx

```bash
# 将项目中的 nginx/storyshare.conf 复制到 ECS
# （此文件已存在于 Git 仓库中）
cp /opt/storyshare/nginx/storyshare.conf /etc/nginx/conf.d/storyshare.conf

# 测试 Nginx 配置
nginx -t

# 启动 Nginx
systemctl enable nginx
systemctl start nginx

# 确认监听
ss -tlnp | grep -E "443|80"
```

### 6. 修改 Express 监听地址

编辑 `backend/.env`，确保 Express 仅监听本地（不暴露到公网）：

```env
PORT=3000
HOST=127.0.0.1     # 新增：仅监听本地回环地址
```

### 7. 启动后端服务（使用 PM2 保活）

```bash
npm install -g pm2
cd /opt/storyshare/backend
pm2 start server.js --name storyshare-backend
pm2 startup && pm2 save
```

---

## 三、Cloudflare Pages 部署

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

## 四、常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| Cloudflare 502 错误 | Nginx 或 PM2 未启动 | `systemctl status nginx`、`pm2 status` 检查 |
| Nginx 无法启动 | SSL 证书路径错误 | `nginx -t` 检查配置错误 |
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
├── nginx/
│   └── storyshare.conf          # Nginx 反向代理 + SSL 配置
└── wrangler.toml                # Cloudflare 配置
