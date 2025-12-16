import { useState } from 'react'
import './FeedbackList.css'

function FeedbackList({ feedbacks, currentUser, onUpdateFeedback, onDeleteFeedback, marketId, onAddReply, onDeleteReply, hasSubmitted = false, showOnlyCurrentUser = false }) {
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [expandedReplies, setExpandedReplies] = useState({}) // 记录哪些反馈的回复是展开的

  const handleStartEdit = (feedback) => {
    setEditingId(feedback.id)
    setEditText(feedback.comment)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = (feedbackId) => {
    if (!editText.trim()) {
      alert('反馈内容不能为空')
      return
    }
    onUpdateFeedback(marketId, feedbackId, editText.trim())
    setEditingId(null)
    setEditText('')
  }

  const handleStartReply = (feedbackId) => {
    setReplyingToId(feedbackId)
    setReplyText('')
  }

  const handleCancelReply = () => {
    setReplyingToId(null)
    setReplyText('')
  }

  const handleSubmitReply = (feedbackId) => {
    if (!replyText.trim()) {
      alert('回复内容不能为空')
      return
    }
    onAddReply(marketId, feedbackId, replyText.trim())
    setReplyingToId(null)
    setReplyText('')
    // 自动展开回复
    setExpandedReplies(prev => ({
      ...prev,
      [feedbackId]: true
    }))
  }

  const toggleReplies = (feedbackId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [feedbackId]: !prev[feedbackId]
    }))
  }

  // 如果只显示当前用户的反馈，过滤反馈列表
  const filteredFeedbacks = showOnlyCurrentUser && currentUser
    ? feedbacks.filter(feedback => feedback.userId === currentUser.id)
    : feedbacks

  if (filteredFeedbacks.length === 0) {
    return (
      <div className="no-feedback">
        <p>暂无反馈，成为第一个留言的人吧！</p>
      </div>
    )
  }

  return (
    <div className="feedback-list">
      {filteredFeedbacks.map((feedback) => {
        const isOwner = currentUser && feedback.userId === currentUser.id
        const isAdmin = currentUser && currentUser.isAdmin
        const canEdit = isOwner || isAdmin // 管理员或所有者可以编辑
        const isEditing = editingId === feedback.id
        
        // 调试信息（开发时使用，生产环境可删除）
        if (process.env.NODE_ENV === 'development') {
          console.log('反馈检查:', {
            feedbackId: feedback.id,
            feedbackUserId: feedback.userId,
            currentUserId: currentUser?.id,
            isOwner: isOwner,
            userName: feedback.userName,
            currentUserName: currentUser?.name
          })
        }

        return (
          <div key={feedback.id} className="feedback-item">
            <div className="feedback-avatar-container">
              <img
                src={generateAvatar(feedback.userName)}
                alt={feedback.userName}
                className="feedback-avatar"
              />
            </div>
            <div className="feedback-content">
              <div className="feedback-header-info">
                <span className="feedback-user-name">{feedback.userName}</span>
                <span className="feedback-time">
                  {feedback.updatedAt ? '已编辑 · ' : ''}
                  {formatTime(feedback.updatedAt || feedback.timestamp)}
                </span>
              </div>
              
              {isEditing ? (
                <div className="feedback-edit-form">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="feedback-edit-input"
                    rows="3"
                  />
                  <div className="feedback-edit-actions">
                    <button
                      onClick={() => handleSaveEdit(feedback.id)}
                      className="save-button"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="cancel-edit-button"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="feedback-text">{feedback.comment}</p>
                  <div className="feedback-actions-row">
                    {canEdit && !hasSubmitted && (
                      <div className="feedback-actions">
                        {isAdmin && !isOwner && (
                          <span className="admin-badge">管理员操作</span>
                        )}
                        <button
                          onClick={() => handleStartEdit(feedback)}
                          className="edit-button"
                          title={isAdmin && !isOwner ? "管理员编辑" : "编辑"}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => onDeleteFeedback(marketId, feedback.id)}
                          className="delete-button"
                          title={isAdmin && !isOwner ? "管理员删除" : "删除"}
                        >
                          删除
                        </button>
                      </div>
                    )}
                    {/* 只有反馈作者可以回复自己的反馈 */}
                    {isOwner && (
                      <button
                        onClick={() => handleStartReply(feedback.id)}
                        className="reply-button"
                      >
                        💬 回复
                      </button>
                    )}
                  </div>
                  
                  {/* 回复表单 */}
                  {replyingToId === feedback.id && (
                    <div className="reply-form">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="reply-input"
                        placeholder="写下你的回复..."
                        rows="2"
                      />
                      <div className="reply-form-actions">
                        <button
                          onClick={() => handleSubmitReply(feedback.id)}
                          className="submit-reply-button"
                        >
                          发送
                        </button>
                        <button
                          onClick={handleCancelReply}
                          className="cancel-reply-button"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {feedback.replies && feedback.replies.length > 0 && (
                    <div className="replies-section">
                      <button
                        onClick={() => toggleReplies(feedback.id)}
                        className="toggle-replies-button"
                      >
                        {expandedReplies[feedback.id] ? '▼' : '▶'} 
                        {feedback.replies.length} 条回复
                      </button>
                      
                      {expandedReplies[feedback.id] && (
                        <div className="replies-list">
                          {feedback.replies.map((reply) => {
                            const isReplyOwner = currentUser && reply.userId === currentUser.id
                            const isReplyAdmin = currentUser && currentUser.isAdmin
                            const canDeleteReply = isReplyOwner || isReplyAdmin

                            return (
                              <div key={reply.id} className="reply-item">
                                <div className="reply-avatar-container">
                                  <img
                                    src={generateAvatar(reply.userName)}
                                    alt={reply.userName}
                                    className="reply-avatar"
                                  />
                                </div>
                                <div className="reply-content">
                                  <div className="reply-header-info">
                                    <span className="reply-user-name">{reply.userName}</span>
                                    <span className="reply-time">
                                      {formatTime(reply.timestamp)}
                                    </span>
                                  </div>
                                  <p className="reply-text">{reply.comment}</p>
                                  {canDeleteReply && !hasSubmitted && (
                                    <button
                                      onClick={() => onDeleteReply(marketId, feedback.id, reply.id)}
                                      className="delete-reply-button"
                                      title={isReplyAdmin && !isReplyOwner ? "管理员删除" : "删除"}
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 根据用户名生成头像URL
function generateAvatar(name) {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E2']
  const color = colors[name.charCodeAt(0) % colors.length]
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=64&bold=true`
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default FeedbackList

