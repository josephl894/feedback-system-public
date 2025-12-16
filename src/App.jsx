import { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    // 检查本地存储的用户信息
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      // 确保isAdmin字段存在（兼容旧数据）
      if (userData.name && userData.name.toLowerCase() === 'admin') {
        userData.isAdmin = true
      }
      setUser(userData)
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleRegister = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setShowRegister(false)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <div className="App">
      {!user ? (
        showRegister ? (
          <Register 
            onRegister={handleRegister} 
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App

