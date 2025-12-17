import { useState } from 'react'
import axios from 'axios'
import './Login.css'

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 基于用户名生成稳定的用户ID（使用简单哈希）
  function generateUserId(username) {
    let hash = 0
    const normalizedUsername = username.trim().toLowerCase()
    for (let i = 0; i < normalizedUsername.length; i++) {
      const char = normalizedUsername.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    // 确保ID是正数
    return Math.abs(hash).toString()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/login', {
        username: username.trim(),
        password
      })

      if (response.data.success) {
        // 生成头像
        const avatar = generateAvatar(response.data.user.name)
        onLogin({
          id: response.data.user.id,
          name: response.data.user.name,
          avatar: avatar,
          isAdmin: response.data.user.isAdmin || false
        })
      }
    } catch (error) {
      setError(error.response?.data?.error || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 根据用户名生成头像URL（使用UI Avatars服务）
  function generateAvatar(name) {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E2']
    const color = colors[name.charCodeAt(0) % colors.length]
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128&bold=true`
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>市场数据反馈系统</h1>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
          <div className="switch-form">
            <span>还没有账户？</span>
            <button
              type="button"
              className="switch-button"
              onClick={onSwitchToRegister}
            >
              立即注册
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login

