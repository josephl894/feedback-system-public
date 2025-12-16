import { useState } from 'react'
import './FeedbackForm.css'

function FeedbackForm({ onSubmit, onCancel }) {
  const [comment, setComment] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onSubmit(comment.trim())
      setComment('')
    } else {
      alert('请输入反馈内容')
    }
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="请输入您的反馈意见..."
        rows="4"
        className="feedback-input"
      />
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">
          取消
        </button>
        <button type="submit" className="submit-button">
          提交反馈
        </button>
      </div>
    </form>
  )
}

export default FeedbackForm

