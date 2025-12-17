import { kv } from '@vercel/kv';

// Admin configuration - move to environment variables for production
const ADMIN_CONFIG = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

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

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const userId = generateUserId(username);

    // Check if admin
    const isAdmin = username.trim().toLowerCase() === ADMIN_CONFIG.username.toLowerCase() &&
                    password === ADMIN_CONFIG.password;

    if (isAdmin) {
      return res.json({
        success: true,
        user: {
          id: userId,
          name: username.trim(),
          isAdmin: true
        }
      });
    }

    // Check regular user from KV store
    const users = await kv.get('users') || {};
    const user = users[userId];

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    users[userId] = user;
    await kv.set('users', users);

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.username,
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: '登录失败: ' + error.message });
  }
}
