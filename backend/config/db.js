const mysql = require('mysql2/promise');

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
    
    // 创建文章表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        category ENUM('story', 'quote') DEFAULT 'story',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // 插入默认管理员（如果不存在，密码：12345）
    const bcrypt = require('bcryptjs');
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
