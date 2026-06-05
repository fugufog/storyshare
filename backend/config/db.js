const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// 数据库连接池配置
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'storyshare',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化数据库表和默认管理员
async function initDB() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        nickname VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 如果 nickname 字段不存在，添加它（兼容旧数据库）
    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN nickname VARCHAR(50) AFTER username
      `);
    } catch (e) {
      // 字段已存在，忽略错误
    }

    // 添加 nav_layout 偏好字段
    try {
      await connection.query(
        "ALTER TABLE users ADD COLUMN nav_layout ENUM('sidebar','topbar') DEFAULT 'sidebar' AFTER role"
      );
    } catch (e) { /* 已存在 */ }

    // 添加 last_seen_version 字段
    try {
      await connection.query(
        'ALTER TABLE users ADD COLUMN last_seen_version VARCHAR(20) DEFAULT NULL AFTER nav_layout'
      );
    } catch (e) { /* 已存在 */ }

    // 创建文章表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        category ENUM('story', 'quote') DEFAULT 'story',
        theme VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 兼容旧表：添加 theme 列
    try {
      await connection.query('ALTER TABLE posts ADD COLUMN theme VARCHAR(100) DEFAULT NULL AFTER category');
    } catch (e) {
      // 列已存在，忽略
    }

    // 迁移：category 从 ENUM 改为 VARCHAR 以支持动态分类
    try {
      await connection.query("ALTER TABLE posts MODIFY COLUMN category VARCHAR(50) DEFAULT 'story'");
    } catch (e) {
      // 已修改，忽略
    }

    // 创建分类表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(50) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 种子默认分类
    await connection.query(
      'INSERT IGNORE INTO categories (name, label, sort_order) VALUES (?, ?, ?), (?, ?, ?)',
      ['story', '故事', 0, 'quote', '短句', 1]
    );

    // 创建公告表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        theme VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建主题表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 种子默认主题
    await connection.query(
      'INSERT IGNORE INTO themes (name) VALUES (?), (?), (?), (?), (?), (?), (?)',
      ['春日物语', '夏夜蝉鸣', '秋日私语', '冬日暖阳', '生活随笔', '旅行见闻', '读书笔记']
    );

    // 创建专辑表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS albums (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500) DEFAULT NULL,
        is_public TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建专辑内容表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS album_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        album_id INT NOT NULL,
        content TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
      )
    `);

    // 为 album_entries 添加 title 字段（v8.2 迁移）
    try {
      await connection.query(
        'ALTER TABLE album_entries ADD COLUMN title VARCHAR(200) DEFAULT NULL AFTER album_id'
      );
    } catch (e) {
      // 字段已存在，忽略错误
    }

    // 创建评论表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT DEFAULT NULL,
        album_id INT DEFAULT NULL,
        entry_id INT DEFAULT NULL,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES album_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 迁移：为已有评论表添加专辑/条目评论支持
    try { await connection.query('ALTER TABLE comments ADD COLUMN album_id INT DEFAULT NULL AFTER post_id'); } catch (e) { /* 忽略 */ }
    try { await connection.query('ALTER TABLE comments ADD COLUMN entry_id INT DEFAULT NULL AFTER album_id'); } catch (e) { /* 忽略 */ }
    try { await connection.query('ALTER TABLE comments MODIFY post_id INT DEFAULT NULL'); } catch (e) { /* 忽略 */ }
    try { await connection.query('ALTER TABLE comments ADD FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE'); } catch (e) { /* 忽略 */ }
    try { await connection.query('ALTER TABLE comments ADD FOREIGN KEY (entry_id) REFERENCES album_entries(id) ON DELETE CASCADE'); } catch (e) { /* 忽略 */ }

    // 插入默认管理员（如果不存在，密码：12345）
    const hashedPassword = await bcrypt.hash('12345', 10);
    
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      ['fugu']
    );
    
    if (existingAdmin.length === 0) {
      await connection.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['fugu', hashedPassword, 'admin']
      );
      console.log('默认管理员账号已创建: fugu');
    }
    
    connection.release();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    console.error('完整错误:', error);
    throw error; // 阻止服务器在数据库未就绪时启动
  }
}

module.exports = { pool, initDB };
