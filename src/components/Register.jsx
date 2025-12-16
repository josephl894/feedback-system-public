import { useState } from 'react'
import axios from 'axios'
import './Login.css'

function Register({ onRegister, onSwitchToLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 验证输入
    if (!username.trim() || !password || !confirmPassword || !inviteCode.trim()) {
      setError('请填写所有字段')
      return
    }

    if (username.trim().length < 3) {
      setError('用户名至少需要3个字符')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    // 密码强度验证：至少包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
    if (!passwordRegex.test(password)) {
      setError('密码必须包含至少一个字母和一个数字')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    // 验证邀请码
    if (inviteCode.trim() !== 'yoyomarket') {
      setError('邀请码错误')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/register', {
        username: username.trim(),
        password,
        inviteCode: inviteCode.trim()
      })

      if (response.data.success) {
        // 注册成功后自动登录
        const loginResponse = await axios.post('/api/login', {
          username: username.trim(),
          password
        })

        if (loginResponse.data.success) {
          // 生成头像
          const avatar = generateAvatar(username.trim())
          onRegister({
            id: loginResponse.data.user.id,
            name: loginResponse.data.user.name,
            avatar: avatar,
            isAdmin: loginResponse.data.user.isAdmin || false
          })
        }
      }
    } catch (error) {
      console.error('注册错误详情:', error)
      console.error('错误响应:', error.response?.data)
      const errorMessage = error.response?.data?.error || error.message || '注册失败，请重试'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // 根据用户名生成头像URL
  function generateAvatar(name) {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E2']
    const color = colors[name.charCodeAt(0) % colors.length]
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128&bold=true`
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>注册账户</h1>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="reg-username">用户名</label>
            <input
              type="text"
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="至少3个字符"
              required
              minLength={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">密码</label>
            <input
              type="password"
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6个字符，包含字母和数字"
              required
              minLength={6}
            />
            <small className="form-hint">密码必须包含至少一个字母和一个数字</small>
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm-password">确认密码</label>
            <input
              type="password"
              id="reg-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="invite-code">邀请码</label>
            <input
              type="text"
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="请输入邀请码"
              required
            />
            <small className="form-hint">注册需要有效的邀请码</small>
          </div>
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
          <div className="switch-form">
            <span>已有账户？</span>
            <button
              type="button"
              className="switch-button"
              onClick={onSwitchToLogin}
            >
              立即登录
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register

