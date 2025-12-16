import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// 静态文件服务：生产环境使用dist目录，开发环境使用public目录
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  app.use(express.static('dist'));
} else {
  app.use(express.static('public'));
}

// 信任代理（用于获取真实IP地址）
app.set('trust proxy', true);

// 反馈数据文件路径
const feedbackFile = path.join(__dirname, 'feedback.json');
// 评分数据文件路径
const ratingsFile = path.join(__dirname, 'ratings.json');
// 用户数据文件路径
const usersFile = path.join(__dirname, 'users.json');
// 字段回复数据文件路径
const fieldRepliesFile = path.join(__dirname, 'fieldReplies.json');

// 初始化反馈数据文件
if (!fs.existsSync(feedbackFile)) {
  fs.writeFileSync(feedbackFile, JSON.stringify({}, null, 2));
}

// 初始化评分数据文件
if (!fs.existsSync(ratingsFile)) {
  fs.writeFileSync(ratingsFile, JSON.stringify({}, null, 2));
}

// 初始化用户数据文件
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify({}, null, 2));
}

// 初始化字段回复数据文件
if (!fs.existsSync(fieldRepliesFile)) {
  fs.writeFileSync(fieldRepliesFile, JSON.stringify({}, null, 2));
}

// 读取反馈数据
function readFeedback() {
  try {
    const data = fs.readFileSync(feedbackFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// 保存反馈数据
function saveFeedback(data) {
  fs.writeFileSync(feedbackFile, JSON.stringify(data, null, 2));
}

// 读取评分数据
function readRatings() {
  try {
    const data = fs.readFileSync(ratingsFile, 'utf8');
    const ratings = JSON.parse(data);
    
    // 检测是否为旧格式（顶层key是marketId而不是日期）
    // 旧格式: { "marketId": { "userId": {...} } }
    // 新格式: { "2025-12-04": { "marketId": { "userId": {...} } } }
    if (Object.keys(ratings).length > 0) {
      const firstKey = Object.keys(ratings)[0];
      // 如果第一个key不是日期格式（YYYY-MM-DD），说明是旧格式
      if (!/^\d{4}-\d{2}-\d{2}$/.test(firstKey)) {
        console.log('⚠️ [评分数据] 检测到旧格式，需要迁移...');
        // 将旧格式转换为新格式
        // 由于旧格式没有日期信息，我们使用"legacy"作为日期key，或者使用今天的日期
        const today = new Date().toISOString().split('T')[0];
        const migratedRatings = {
          [today]: ratings  // 将旧数据迁移到今天
        };
        // 保存迁移后的数据
        saveRatings(migratedRatings);
        console.log(`✅ [评分数据] 已迁移旧格式数据到日期: ${today}`);
        return migratedRatings;
      }
    }
    
    return ratings;
  } catch (error) {
    return {};
  }
}

// 保存评分数据
function saveRatings(data) {
  fs.writeFileSync(ratingsFile, JSON.stringify(data, null, 2));
}

// 读取字段回复数据
function readFieldReplies() {
  try {
    const data = fs.readFileSync(fieldRepliesFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// 保存字段回复数据
function saveFieldReplies(data) {
  fs.writeFileSync(fieldRepliesFile, JSON.stringify(data, null, 2));
}

// 读取用户数据
function readUsers() {
  try {
    const data = fs.readFileSync(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// 保存用户数据
function saveUsers(data) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

// 邀请码配置
const INVITE_CODE = 'yoyomarket';

// 登录失败记录（用于防止暴力破解）
const loginAttempts = new Map(); // key: userId或IP, value: { count, lastAttempt }

// 清理过期的登录失败记录（30分钟后清除）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.lastAttempt > 30 * 60 * 1000) { // 30分钟
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // 每5分钟清理一次

// 用户注册
app.post('/api/register', (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;
    
    console.log('注册请求:', { username, passwordLength: password?.length, hasInviteCode: !!inviteCode });
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (!inviteCode) {
      return res.status(400).json({ error: '邀请码不能为空' });
    }

    // 验证邀请码
    if (inviteCode.trim() !== INVITE_CODE) {
      console.log('邀请码验证失败:', { provided: inviteCode, expected: INVITE_CODE });
      return res.status(400).json({ error: '邀请码错误' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    // 密码强度验证：至少包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: '密码必须包含至少一个字母和一个数字' });
    }

    const users = readUsers();
    const normalizedUsername = username.trim().toLowerCase();
    const userId = generateUserId(username);

    console.log('生成的用户ID:', userId);
    console.log('现有用户数量:', Object.keys(users).length);

    // 检查用户名是否已存在
    if (users[userId]) {
      console.log('用户名已存在:', userId);
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建新用户
    users[userId] = {
      id: userId,
      username: username.trim(),
      password: password, // 实际应用中应该加密存储
      createdAt: new Date().toISOString(),
      isAdmin: false
    };

    saveUsers(users);
    console.log('用户注册成功:', userId);

    res.json({ 
      success: true, 
      message: '注册成功',
      user: {
        id: userId,
        username: username.trim()
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败: ' + error.message });
  }
});

// 用户登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const users = readUsers();
  const userId = generateUserId(username);
  const user = users[userId];

  // 管理员配置
  const ADMIN_CONFIG = {
    username: 'admin',
    password: 'admin123'
  };

  // 检查是否是管理员
  const isAdmin = username.trim().toLowerCase() === ADMIN_CONFIG.username.toLowerCase() &&
                  password === ADMIN_CONFIG.password;

  // 登录失败次数限制（非管理员用户）
  if (!isAdmin) {
    const attemptKey = userId || clientIp;
    const attempt = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
    
    // 检查是否超过最大尝试次数（5次）
    if (attempt.count >= 5) {
      const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
      const lockoutTime = 30 * 60 * 1000; // 30分钟锁定
      
      if (timeSinceLastAttempt < lockoutTime) {
        const remainingMinutes = Math.ceil((lockoutTime - timeSinceLastAttempt) / (60 * 1000));
        console.log('登录失败次数过多，账户已锁定:', { userId, clientIp, remainingMinutes });
        return res.status(429).json({ 
          error: `登录失败次数过多，账户已锁定。请${remainingMinutes}分钟后再试。` 
        });
      } else {
        // 锁定时间已过，重置计数
        attempt.count = 0;
      }
    }

    // 检查用户是否存在
    if (!user) {
      attempt.count++;
      attempt.lastAttempt = Date.now();
      loginAttempts.set(attemptKey, attempt);
      console.log('登录失败: 用户不存在', { userId, clientIp, attempts: attempt.count });
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    if (user.password !== password) {
      attempt.count++;
      attempt.lastAttempt = Date.now();
      loginAttempts.set(attemptKey, attempt);
      const remainingAttempts = 5 - attempt.count;
      console.log('登录失败: 密码错误', { userId, clientIp, attempts: attempt.count, remaining: remainingAttempts });
      return res.status(401).json({ 
        error: `用户名或密码错误${remainingAttempts > 0 ? `，还有${remainingAttempts}次尝试机会` : '，账户将被锁定30分钟'}` 
      });
    }

    // 登录成功，清除失败记录
    loginAttempts.delete(attemptKey);
  }

  // 登录成功
  if (isAdmin) {
    console.log('管理员登录成功:', { userId, clientIp });
    return res.json({
      success: true,
      user: {
        id: userId,
        name: username.trim(),
        isAdmin: true
      }
    });
  }

  // 更新最后登录时间
  user.lastLoginAt = new Date().toISOString();
  saveUsers(users);
  
  console.log('用户登录成功:', { userId, clientIp });

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.username,
      isAdmin: false
    }
  });
});

// 获取所有反馈
app.get('/api/feedback', (req, res) => {
  const feedback = readFeedback();
  res.json(feedback);
});

// 添加反馈
app.post('/api/feedback', (req, res) => {
  const { marketId, userId, userName, comment } = req.body;
  
  if (!marketId || !userId || !userName || !comment) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const feedback = readFeedback();
  
  if (!feedback[marketId]) {
    feedback[marketId] = [];
  }

  const newFeedback = {
    id: Date.now().toString(),
    userId,
    userName,
    comment,
    timestamp: new Date().toISOString()
  };

  feedback[marketId].push(newFeedback);
  saveFeedback(feedback);

  res.json({ success: true, feedback: newFeedback });
});

// 检查是否是管理员
function isAdmin(userId, userName) {
  // 管理员用户名和ID（基于用户名生成）
  const adminUsername = 'admin';
  const adminUserId = generateUserId(adminUsername);
  return userId === adminUserId || userName?.toLowerCase() === adminUsername.toLowerCase();
}

// 生成用户ID（与前端保持一致）
function generateUserId(username) {
  let hash = 0;
  const normalizedUsername = username.trim().toLowerCase();
  for (let i = 0; i < normalizedUsername.length; i++) {
    const char = normalizedUsername.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

// 修改反馈
app.put('/api/feedback', (req, res) => {
  const { marketId, feedbackId, userId, userName, comment } = req.body;
  
  if (!marketId || !feedbackId || !userId || !comment) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const feedback = readFeedback();
  
  if (!feedback[marketId]) {
    return res.status(404).json({ error: '未找到该市场的反馈' });
  }

  const feedbackIndex = feedback[marketId].findIndex(f => f.id === feedbackId);
  
  if (feedbackIndex === -1) {
    return res.status(404).json({ error: '未找到该反馈' });
  }

  // 检查是否是反馈的创建者或管理员
  const isOwner = feedback[marketId][feedbackIndex].userId === userId;
  const isAdminUser = isAdmin(userId, userName);
  
  if (!isOwner && !isAdminUser) {
    return res.status(403).json({ error: '无权修改此反馈' });
  }

  // 更新反馈
  feedback[marketId][feedbackIndex].comment = comment;
  feedback[marketId][feedbackIndex].updatedAt = new Date().toISOString();
  // 如果是管理员编辑，记录管理员操作
  if (isAdminUser && !isOwner) {
    feedback[marketId][feedbackIndex].adminEdited = true;
    feedback[marketId][feedbackIndex].adminEditor = userName;
  }
  
  saveFeedback(feedback);

  res.json({ success: true, feedback: feedback[marketId][feedbackIndex] });
});

// 删除反馈
app.delete('/api/feedback', (req, res) => {
  const { marketId, feedbackId, userId, userName } = req.body;
  
  if (!marketId || !feedbackId || !userId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const feedback = readFeedback();
  
  if (!feedback[marketId]) {
    return res.status(404).json({ error: '未找到该市场的反馈' });
  }

  const feedbackIndex = feedback[marketId].findIndex(f => f.id === feedbackId);
  
  if (feedbackIndex === -1) {
    return res.status(404).json({ error: '未找到该反馈' });
  }

  // 检查是否是反馈的创建者或管理员
  const isOwner = feedback[marketId][feedbackIndex].userId === userId;
  const isAdminUser = isAdmin(userId, userName);
  
  if (!isOwner && !isAdminUser) {
    return res.status(403).json({ error: '无权删除此反馈' });
  }

  // 删除反馈
  feedback[marketId].splice(feedbackIndex, 1);
  
  saveFeedback(feedback);

  res.json({ success: true });
});

// 添加回复
app.post('/api/feedback/reply', (req, res) => {
  const { marketId, feedbackId, userId, userName, comment } = req.body;
  
  if (!marketId || !feedbackId || !userId || !userName || !comment) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const feedback = readFeedback();
  
  if (!feedback[marketId]) {
    return res.status(404).json({ error: '未找到该市场的反馈' });
  }

  const feedbackIndex = feedback[marketId].findIndex(f => f.id === feedbackId);
  
  if (feedbackIndex === -1) {
    return res.status(404).json({ error: '未找到该反馈' });
  }

  // 初始化replies数组（如果不存在）
  if (!feedback[marketId][feedbackIndex].replies) {
    feedback[marketId][feedbackIndex].replies = [];
  }

  const newReply = {
    id: Date.now().toString(),
    userId,
    userName,
    comment,
    timestamp: new Date().toISOString()
  };

  feedback[marketId][feedbackIndex].replies.push(newReply);
  saveFeedback(feedback);

  res.json({ success: true, reply: newReply });
});

// 删除回复
app.delete('/api/feedback/reply', (req, res) => {
  const { marketId, feedbackId, replyId, userId, userName } = req.body;
  
  if (!marketId || !feedbackId || !replyId || !userId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const feedback = readFeedback();
  
  if (!feedback[marketId]) {
    return res.status(404).json({ error: '未找到该市场的反馈' });
  }

  const feedbackIndex = feedback[marketId].findIndex(f => f.id === feedbackId);
  
  if (feedbackIndex === -1) {
    return res.status(404).json({ error: '未找到该反馈' });
  }

  if (!feedback[marketId][feedbackIndex].replies) {
    return res.status(404).json({ error: '未找到回复' });
  }

  const replyIndex = feedback[marketId][feedbackIndex].replies.findIndex(r => r.id === replyId);
  
  if (replyIndex === -1) {
    return res.status(404).json({ error: '未找到该回复' });
  }

  // 检查是否是回复的创建者或管理员
  const isOwner = feedback[marketId][feedbackIndex].replies[replyIndex].userId === userId;
  const isAdminUser = isAdmin(userId, userName);
  
  if (!isOwner && !isAdminUser) {
    return res.status(403).json({ error: '无权删除此回复' });
  }

  // 删除回复
  feedback[marketId][feedbackIndex].replies.splice(replyIndex, 1);
  
  saveFeedback(feedback);

  res.json({ success: true });
});

// ==================== 字段回复相关API ====================

// 获取字段回复
app.get('/api/field-replies/:marketId', (req, res) => {
  try {
    const { marketId } = req.params;
    const fieldReplies = readFieldReplies();
    
    // 返回该市场的所有字段回复
    const marketReplies = fieldReplies[marketId] || {};
    res.json(marketReplies);
  } catch (error) {
    console.error('获取字段回复失败:', error);
    res.status(500).json({ error: '获取字段回复失败' });
  }
});

// 添加字段回复
app.post('/api/field-replies', (req, res) => {
  try {
    const { marketId, fieldName, userId, userName, comment } = req.body;
    
    if (!marketId || !fieldName || !userId || !userName || !comment) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const fieldReplies = readFieldReplies();
    
    if (!fieldReplies[marketId]) {
      fieldReplies[marketId] = {};
    }
    
    if (!fieldReplies[marketId][fieldName]) {
      fieldReplies[marketId][fieldName] = [];
    }

    const newReply = {
      id: Date.now().toString(),
      userId,
      userName,
      comment,
      timestamp: new Date().toISOString()
    };

    fieldReplies[marketId][fieldName].push(newReply);
    saveFieldReplies(fieldReplies);

    res.json({ success: true, reply: newReply });
  } catch (error) {
    console.error('添加字段回复失败:', error);
    res.status(500).json({ error: '添加字段回复失败' });
  }
});

// 删除字段回复
app.delete('/api/field-replies', (req, res) => {
  try {
    const { marketId, fieldName, replyId, userId } = req.body;
    
    if (!marketId || !fieldName || !replyId || !userId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const fieldReplies = readFieldReplies();
    
    if (!fieldReplies[marketId] || !fieldReplies[marketId][fieldName]) {
      return res.status(404).json({ error: '未找到该字段的回复' });
    }

    const replyIndex = fieldReplies[marketId][fieldName].findIndex(r => r.id === replyId);
    
    if (replyIndex === -1) {
      return res.status(404).json({ error: '未找到该回复' });
    }

    // 检查是否是回复的创建者或管理员
    const isOwner = fieldReplies[marketId][fieldName][replyIndex].userId === userId;
    const isAdminUser = isAdmin(userId, null);
    
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: '无权删除此回复' });
    }

    // 删除回复
    fieldReplies[marketId][fieldName].splice(replyIndex, 1);
    saveFieldReplies(fieldReplies);

    res.json({ success: true });
  } catch (error) {
    console.error('删除字段回复失败:', error);
    res.status(500).json({ error: '删除字段回复失败' });
  }
});

// 简单的CSV解析函数，处理引号内的逗号
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// 获取所有可用的日期列表
app.get('/api/dates', (req, res) => {
  try {
    const files = fs.readdirSync(__dirname);
    const datePattern = /top20_markets_cycle-(\d{8})-\d{6}\.csv/;
    const dates = [];
    
    files.forEach(file => {
      const match = file.match(datePattern);
      if (match) {
        const dateStr = match[1]; // YYYYMMDD
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const date = new Date(`${year}-${month}-${day}`);
        
        dates.push({
          date: `${year}-${month}-${day}`,
          dateStr: dateStr,
          display: `${year}年${month}月${day}日`,
          timestamp: date.getTime()
        });
      }
    });
    
    // 按日期降序排序（最新的在前）
    dates.sort((a, b) => b.timestamp - a.timestamp);
    res.json(dates);
  } catch (error) {
    console.error('获取日期列表失败:', error);
    res.status(500).json({ error: '获取日期列表失败: ' + error.message });
  }
});

// 根据日期获取CSV数据
function getCSVPathByDate(dateStr) {
  const files = fs.readdirSync(__dirname);
  const datePattern = /top20_markets_cycle-(\d{8})-\d{6}\.csv/;
  
  // 如果未指定日期，返回最新的文件
  if (!dateStr) {
    const csvFiles = files
      .filter(file => datePattern.test(file))
      .sort()
      .reverse();
    
    if (csvFiles.length > 0) {
      return path.join(__dirname, csvFiles[0]);
    }
    return null;
  }
  
  // 查找指定日期的文件
  // dateStr格式: YYYY-MM-DD 或 YYYYMMDD
  let datePart = dateStr.replace(/-/g, '');
  const pattern = new RegExp(`top20_markets_cycle-${datePart}-\\d{6}\\.csv`);
  
  const matchedFile = files.find(file => pattern.test(file));
  
  if (matchedFile) {
    return path.join(__dirname, matchedFile);
  }
  
  return null;
}

// 获取CSV数据（支持日期参数）
app.get('/api/markets', (req, res) => {
  const date = req.query.date; // 格式: YYYY-MM-DD 或 YYYYMMDD
  
  console.log(`📡 [API /api/markets] 请求日期参数: ${date}`);
  
  let csvPath;
  if (date) {
    csvPath = getCSVPathByDate(date);
    console.log(`📡 [API /api/markets] 查找日期 ${date} 的CSV文件，路径: ${csvPath}`);
  } else {
    // 默认使用最新的文件
    csvPath = getCSVPathByDate(null);
    console.log(`📡 [API /api/markets] 未指定日期，使用最新文件，路径: ${csvPath}`);
  }
  
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error(`❌ [API /api/markets] 未找到CSV文件: ${csvPath}`);
    return res.status(404).json({ error: '未找到指定日期的数据文件' });
  }
  
  console.log(`✅ [API /api/markets] 找到CSV文件: ${csvPath}`);
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.json([]);
    }
    
    const headers = parseCSVLine(lines[0]);
    
    const markets = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const market = {};
      headers.forEach((header, i) => {
        market[header] = values[i] || '';
      });
      return market;
    }).filter(market => market['Market ID']);

    res.json(markets);
  } catch (error) {
    console.error('读取CSV失败:', error);
    res.status(500).json({ error: '读取数据失败: ' + error.message });
  }
});

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const HOST = '0.0.0.0'; // 监听所有网络接口
const localIP = getLocalIP();

// 提交评分
app.post('/api/ratings', (req, res) => {
  const { marketId, userId, rating, date } = req.body;
  
  // 验证评分：只允许1、2、3星（1星=一般，2星=良好，3星=优秀）
  const validRatings = [1, 2, 3];
  // 确保rating是数字类型
  const ratingValue = typeof rating === 'string' ? parseFloat(rating) : Number(rating);
  
  if (!marketId || !userId || !rating || isNaN(ratingValue) || !validRatings.includes(ratingValue)) {
    return res.status(400).json({ error: '无效的评分参数，评分只能是1、2或3星（1星=一般，2星=良好，3星=优秀）' });
  }

  // 如果没有提供日期，使用今天的日期
  const ratingDate = date || new Date().toISOString().split('T')[0];
  
  const ratings = readRatings();
  
  // 按日期存储评分数据
  if (!ratings[ratingDate]) {
    ratings[ratingDate] = {};
  }
  
  if (!ratings[ratingDate][marketId]) {
    ratings[ratingDate][marketId] = {};
  }

  // 保存用户评分（每个用户只能评分一次，重复评分会覆盖）
  ratings[ratingDate][marketId][userId] = {
    rating: ratingValue,
    timestamp: new Date().toISOString()
  };
  
  saveRatings(ratings);

  // 调试日志：检查第一条数据的评分保存
  try {
    const csvPath = getCSVPathByDate(ratingDate);
    if (csvPath && fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length >= 2) {
        const headers = parseCSVLine(lines[0]);
        const csvMarkets = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const market = {};
          headers.forEach((header, i) => {
            market[header] = values[i] || '';
          });
          return market;
        }).filter(market => market['Market ID']);
        const csvMarket = csvMarkets.find(m => m['Market ID'] === marketId);
        if (csvMarket && csvMarket.Rank === '1') {
          console.log(`🔍 [服务器-保存评分] Market ID: ${marketId}, userId: ${userId}, rating: ${ratingValue} (原始: ${rating}, 类型: ${typeof rating})`);
        }
      }
    }
  } catch (error) {
    // 忽略读取CSV的错误
  }

  console.log(`✅ [评分] 保存评分成功: 日期=${ratingDate}, marketId=${marketId}, userId=${userId}, rating=${ratingValue}`);

  res.json({ success: true });
});

// 获取排名（返回所有市场，包括没有评分的）
app.get('/api/rankings', (req, res) => {
  try {
    const date = req.query.date; // 支持日期参数
    const marketIdsParam = req.query.marketIds; // 支持marketIds参数，用逗号分隔
    const allRatings = readRatings();
    
    // 如果提供了marketIds参数，只返回这些marketId的排名
    let targetMarketIds = null;
    if (marketIdsParam) {
      targetMarketIds = marketIdsParam.split(',').map(id => id.trim()).filter(id => id);
      // 减少日志输出
    }
    
    // 获取指定日期的评分数据（如果没有日期，使用最新的日期）
    let ratingsForDate = {};
    
    // 检测是否为旧格式（顶层key是marketId而不是日期）
    const isOldFormat = Object.keys(allRatings).length > 0 && 
                        !/^\d{4}-\d{2}-\d{2}$/.test(Object.keys(allRatings)[0]);
    
    if (isOldFormat) {
      // 旧格式：直接使用所有评分数据
      ratingsForDate = allRatings;
      console.log(`⚠️ [排名] 使用旧格式评分数据（兼容模式）`);
    } else {
      // 新格式：按日期获取
      if (date) {
        ratingsForDate = allRatings[date] || {};
      } else {
        // 如果没有指定日期，使用最新的日期
        const dates = Object.keys(allRatings).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort().reverse();
        if (dates.length > 0) {
          ratingsForDate = allRatings[dates[0]];
        }
      }
    }

    // 减少日志输出，只在需要时输出
    // console.log(`📊 [排名] 日期: ${date || '最新'}, 评分数据格式: ${isOldFormat ? '旧格式' : '新格式'}`);
    // console.log(`📊 [排名] 评分数据中的日期: ${isOldFormat ? '旧格式（无日期）' : Object.keys(allRatings).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).join(', ') || '无'}`);
    // console.log(`📊 [排名] 该日期的市场评分数量: ${Object.keys(ratingsForDate).length}`);
    // console.log(`📊 [排名] 评分数据中的marketId列表:`, Object.keys(ratingsForDate).slice(0, 10));

    // 获取所有有评分的marketId（包括外部API的market_id和CSV的Market ID）
    const allMarketIdsWithRatings = Object.keys(ratingsForDate);
    
    // 获取CSV文件路径（用于获取市场详情）
    let csvPath;
    if (date) {
      csvPath = getCSVPathByDate(date);
    } else {
      csvPath = getCSVPathByDate(null);
    }

    let markets = [];
    
    // 如果CSV文件存在，读取CSV中的市场数据
    if (csvPath && fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length >= 2) {
        const headers = parseCSVLine(lines[0]);
        markets = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const market = {};
          headers.forEach((header, i) => {
            market[header] = values[i] || '';
          });
          return market;
        }).filter(market => market['Market ID']);
      }
    }

    // 创建一个包含所有marketId的集合
    const allMarketIds = new Set();
    
    // 如果指定了targetMarketIds，只使用这些marketId
    if (targetMarketIds && targetMarketIds.length > 0) {
      targetMarketIds.forEach(marketId => {
        allMarketIds.add(marketId);
      });
      // 减少日志输出
    } else {
      // 否则，使用CSV的Market ID + 评分数据中的marketId
      // 添加CSV中的Market ID
      markets.forEach(market => {
        if (market['Market ID']) {
          allMarketIds.add(market['Market ID']);
        }
      });
      
      // 添加评分数据中的所有marketId（包括外部API的market_id）
      allMarketIdsWithRatings.forEach(marketId => {
        allMarketIds.add(marketId);
      });
      // 减少日志输出
    }

    // 计算每个市场的平均分和评分人数
    const marketRankings = Array.from(allMarketIds).map(marketId => {
      const marketRatings = ratingsForDate[marketId] || {};
      // 确保rating值是数字类型
      const ratingValues = Object.values(marketRatings).map(r => {
        const rating = typeof r.rating === 'string' ? parseFloat(r.rating) : r.rating;
        return isNaN(rating) ? 0 : rating;
      });
      
      let averageRating = 0;
      let ratingCount = ratingValues.length;
      
      if (ratingCount > 0) {
        const sum = ratingValues.reduce((a, b) => a + b, 0);
        averageRating = sum / ratingCount;
        
        // 调试日志：检查第一条数据的评分计算
        if (marketId && ratingCount > 0) {
          const csvMarket = markets.find(m => m['Market ID'] === marketId);
          if (csvMarket && csvMarket.Rank === 1) {
            console.log(`🔍 [服务器-第一条数据] Market ID: ${marketId}`);
            console.log(`  - 所有评分值:`, Object.values(marketRatings).map(r => r.rating));
            console.log(`  - 转换后的评分值:`, ratingValues);
            console.log(`  - 总和: ${sum}, 数量: ${ratingCount}, 平均分: ${averageRating.toFixed(2)}`);
          }
        }
      }

      // 从CSV中查找市场详情，如果找不到则使用基本信息
      const csvMarket = markets.find(m => m['Market ID'] === marketId);
      const question = csvMarket ? csvMarket.Question : `市场 ${marketId}`;

      // 减少日志输出
      // if (ratingCount > 0) {
      //   console.log(`  📊 市场 ${marketId}: ${ratingCount}个评分, 平均分=${averageRating.toFixed(2)}, 问题="${question}"`);
      // }

      return {
        marketId,
        question,
        averageRating,
        ratingCount
      };
    });
    
    // 减少日志输出
    // console.log(`📊 [排名] 总市场数: ${marketRankings.length}, 有评分的市场数: ${marketRankings.filter(m => m.ratingCount > 0).length}`);

    // 先排序有评分的市场
    // 注意：排名应该只基于当前返回的市场计算，而不是所有市场
    const withRatings = marketRankings
      .filter(item => item.ratingCount > 0)
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.ratingCount - a.ratingCount;
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1  // 排名从1开始，只基于当前返回的市场
      }));

    // 没有评分的市场排在后面，不显示排名
    const withoutRatings = marketRankings
      .filter(item => item.ratingCount === 0)
      .map(item => ({
        ...item,
        rank: null
      }));

    // 合并结果
    const allRankings = [...withRatings, ...withoutRatings];
    
    // 如果指定了targetMarketIds，确保返回的排名只基于这些市场
    // 排名已经正确计算了（基于marketRankings数组），所以这里不需要额外处理
    
    // 减少日志输出，只在有错误或重要信息时输出
    // console.log(`📊 [排名] 最终返回数据: 总数=${allRankings.length}, 有排名=${withRatings.length}, 无排名=${withoutRatings.length}`);
    // if (withRatings.length > 0) {
    //   console.log(`📊 [排名] 前3名:`, withRatings.slice(0, 3).map(r => `${r.marketId}(rank=${r.rank})`).join(', '));
    // }

    res.json(allRankings);
  } catch (error) {
    console.error('获取排名失败:', error);
    res.status(500).json({ error: '获取排名失败' });
  }
});

// 获取用户的评分
app.get('/api/ratings/:marketId/:userId', (req, res) => {
  const { marketId, userId } = req.params;
  const date = req.query.date; // 支持日期参数
  const allRatings = readRatings();
  
  // 如果没有提供日期，使用最新的日期
  let ratingsForDate = {};
  if (date) {
    ratingsForDate = allRatings[date] || {};
    // 兼容旧格式
    if (Object.keys(ratingsForDate).length === 0) {
      const firstKey = Object.keys(allRatings)[0];
      if (firstKey && !/^\d{4}-\d{2}-\d{2}$/.test(firstKey)) {
        ratingsForDate = allRatings;
      }
    }
  } else {
    const dates = Object.keys(allRatings).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort().reverse();
    if (dates.length > 0) {
      ratingsForDate = allRatings[dates[0]];
    } else {
      // 兼容旧格式
      ratingsForDate = allRatings;
    }
  }
  
  if (ratingsForDate[marketId] && ratingsForDate[marketId][userId]) {
    res.json({ rating: ratingsForDate[marketId][userId].rating });
  } else {
    res.json({ rating: 0 });
  }
});

// 检查用户是否已提交数据
app.get('/api/ratings/check-submission', (req, res) => {
  const { userId, date } = req.query;
  
  console.log('🔍 [后端] 检查提交状态 - 用户ID:', userId, '日期:', date);
  
  if (!userId || !date) {
    console.log('⚠️ [后端] 缺少必要参数');
    return res.json({ hasSubmitted: false });
  }
  
  const allRatings = readRatings();
  const ratingsForDate = allRatings[date] || {};
  
  console.log('📊 [后端] 该日期的市场数量:', Object.keys(ratingsForDate).length);
  
  // 检查该日期下是否有该用户的评分数据
  let hasSubmitted = false;
  let foundMarkets = [];
  for (const marketId in ratingsForDate) {
    if (ratingsForDate[marketId][userId]) {
      hasSubmitted = true;
      foundMarkets.push(marketId);
    }
  }
  
  console.log('✅ [后端] 检查结果:', hasSubmitted, '找到的市场:', foundMarkets.length);
  
  res.json({ hasSubmitted });
});

// 生产环境：所有路由都返回index.html（用于React Router）
// 注意：这个路由必须在所有API路由之后
if (isProduction) {
  app.get('*', (req, res) => {
    // 排除API路由
    if (!req.path.startsWith('/api') && !req.path.startsWith('/v1')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  });
}

app.listen(PORT, HOST, () => {
  console.log(`服务器运行在:`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  局域网访问: http://${localIP}:${PORT}`);
  console.log(`  环境: ${isProduction ? '生产环境' : '开发环境'}`);
});

