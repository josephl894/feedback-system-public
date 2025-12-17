import { kv } from '@vercel/kv';

const INVITE_CODE = process.env.INVITE_CODE || 'yoyomarket';

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
    const { username, password, inviteCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (!inviteCode) {
      return res.status(400).json({ error: '邀请码不能为空' });
    }

    if (inviteCode.trim() !== INVITE_CODE) {
      return res.status(400).json({ error: '邀请码错误' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: '用户名至少需要3个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: '密码必须包含至少一个字母和一个数字' });
    }

    const userId = generateUserId(username);
    const users = await kv.get('users') || {};

    if (users[userId]) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    users[userId] = {
      id: userId,
      username: username.trim(),
      password: password,
      createdAt: new Date().toISOString(),
      isAdmin: false
    };

    await kv.set('users', users);

    return res.json({
      success: true,
      message: '注册成功',
      user: {
        id: userId,
        username: username.trim()
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: '注册失败: ' + error.message });
  }
}
