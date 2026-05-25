-- ========================================
-- StoryShare 数据库初始化脚本
-- ========================================

-- 创建数据库（如不存在）
CREATE DATABASE IF NOT EXISTS storyshare DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE storyshare;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章表（故事/短句）
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  category ENUM('story', 'quote') DEFAULT 'story',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员账号（密码: 12345）
-- 密码需要使用 bcrypt 加密，以下为加密后的值
-- 如果通过此 SQL 脚本手动执行，请使用服务器自动初始化功能
-- 或者使用 Node.js 脚本生成 bcrypt 哈希后替换下方占位符
INSERT IGNORE INTO users (username, password, role) VALUES 
('fugu', '$2a$10$YourBcryptHashHere', 'admin');

-- 说明：
-- 首次启动服务器时会自动创建数据库表和默认管理员账号，
-- 如果希望手动初始化，请先通过 `npm install` 安装依赖，
-- 然后运行 Node.js 生成管理员密码的 bcrypt 哈希。
--
-- 快速生成管理员密码哈希：
-- 1. 安装依赖后运行: node -e "const bcrypt=require('bcryptjs');bcrypt.hash('12345',10).then(console.log)"
-- 2. 将生成的哈希值替换上方 '$2a$10$YourBcryptHashHere'
-- 3. 直接导入到 MySQL: mysql -u root -p < database/init.sql
