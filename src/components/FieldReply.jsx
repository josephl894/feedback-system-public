import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './FieldReply.css'

// 选项模式的选项列表
const OPTION_CHOICES = [
  { value: 'meets_requirement', label: '符合需求' },
  { value: 'low_controversy', label: '争议性不足' },
  { value: 'poor_timeliness', label: '时效性不佳' },
  { value: 'low_attraction', label: '内容吸引力不足' },
  { value: 'other', label: '其他' }
]

function FieldReply({ marketId, fieldName, fieldLabel, currentUser, onAddReply, onDeleteReply, useOptions = false, pendingValue, hasSubmitted = false, showOnlyCurrentUser = false, readOnly = false }) {
  const [replies, setReplies] = useState([])
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [selectedOptions, setSelectedOptions] = useState([]) // 改为数组，支持多选
  const [otherText, setOtherText] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  
  // 如果有pendingValue，初始化selectedOptions
  useEffect(() => {
    if (pendingValue && useOptions && typeof pendingValue === 'string') {
      // 从pendingValue中解析已选择的选项
      // pendingValue格式可能是："符合需求，争议性不足" 或 "其他：xxx"
      const options = pendingValue.split('，').map(opt => {
        const trimmedOpt = opt.trim()
        if (trimmedOpt.startsWith('其他：')) {
          return 'other'
        }
        const choice = OPTION_CHOICES.find(c => c.label === trimmedOpt)
        return choice ? choice.value : null
      }).filter(Boolean)
      setSelectedOptions(options)
      
      // 如果有"其他"，提取其他文本
      if (options.includes('other')) {
        const otherMatch = pendingValue.match(/其他：(.+)/)
        if (otherMatch) {
          setOtherText(otherMatch[1].trim())
        }
      }
    } else if (!pendingValue && useOptions) {
      // 如果没有pendingValue，清空选择
      setSelectedOptions([])
      setOtherText('')
    }
  }, [pendingValue, useOptions])

  const loadReplies = async () => {
    if (!marketId) {
      setLoading(false)
      return
    }
    try {
      const response = await axios.get(`/api/field-replies/${marketId}`)
      const fieldReplies = response.data[fieldName] || []
      setReplies(fieldReplies)
    } catch (error) {
      console.error('加载字段回复失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (marketId) {
      loadReplies()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, fieldName])

  const handleOptionChange = (optionValue) => {
    if (hasSubmitted) {
      alert('已提交数据，无法修改')
      return
    }
    
    setSelectedOptions(prev => {
      if (prev.includes(optionValue)) {
        // 取消选择
        return prev.filter(v => v !== optionValue)
      } else {
        // 添加选择
        return [...prev, optionValue]
      }
    })
    // 如果取消选择"其他"，清空其他文本
    if (optionValue === 'other' && selectedOptions.includes('other')) {
      setOtherText('')
    }
  }
  
  // 当选项或otherText变化时，更新临时状态（选项模式下）
  // 使用useRef来避免无限循环
  const prevSelectedOptionsRef = useRef(selectedOptions)
  const prevOtherTextRef = useRef(otherText)
  
  useEffect(() => {
    // 如果已提交，不更新临时状态
    if (hasSubmitted) {
      return
    }
    
    // 检查是否有实际变化，避免不必要的更新
    const selectedChanged = JSON.stringify(prevSelectedOptionsRef.current) !== JSON.stringify(selectedOptions)
    const otherTextChanged = prevOtherTextRef.current !== otherText
    
    if (!selectedChanged && !otherTextChanged) {
      return
    }
    
    // 更新ref
    prevSelectedOptionsRef.current = selectedOptions
    prevOtherTextRef.current = otherText
    
    if (useOptions && selectedOptions.length > 0) {
      // 如果选择了"其他"但未填写内容，不更新临时状态（等待用户填写）
      if (selectedOptions.includes('other') && !otherText.trim()) {
        return
      }
      
      let finalReplyText = ''
      const selectedLabels = selectedOptions.map(optValue => {
        if (optValue === 'other') {
          return `其他：${otherText.trim()}`
        }
        const choice = OPTION_CHOICES.find(opt => opt.value === optValue)
        return choice ? choice.label : optValue
      })
      finalReplyText = selectedLabels.join('，')
      onAddReply(marketId, fieldName, finalReplyText)
    } else if (useOptions && selectedOptions.length === 0 && prevSelectedOptionsRef.current.length > 0) {
      // 如果取消所有选择，清空临时状态（只有在之前有选择的情况下才删除）
      onDeleteReply(marketId, fieldName, 'temp')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, otherText, useOptions, marketId, fieldName, hasSubmitted])

  const handleSubmitReply = async () => {
    if (!marketId) {
      alert('市场ID不存在')
      return
    }

    let finalReplyText = ''

    if (useOptions) {
      // 选项模式（多选）
      if (selectedOptions.length === 0) {
        alert('请至少选择一个选项')
        return
      }

      // 检查是否选择了"其他"但未填写内容
      if (selectedOptions.includes('other') && !otherText.trim()) {
        alert('请填写其他原因')
        return
      }

      // 构建回复文本：选中的选项标签，用逗号分隔
      const selectedLabels = selectedOptions.map(optValue => {
        if (optValue === 'other') {
          return `其他：${otherText.trim()}`
        }
        const choice = OPTION_CHOICES.find(opt => opt.value === optValue)
        return choice ? choice.label : optValue
      })
      finalReplyText = selectedLabels.join('，')
    } else {
      // 文本输入模式
      if (!replyText.trim()) {
        alert('回复内容不能为空')
        return
      }
      finalReplyText = replyText.trim()
    }

    try {
      await onAddReply(marketId, fieldName, finalReplyText)
      setReplyText('')
      setSelectedOptions([])
      setOtherText('')
      setShowReplyForm(false)
      await loadReplies() // 重新加载回复列表
      setExpanded(true) // 自动展开回复列表
    } catch (error) {
      console.error('提交回复失败:', error)
    }
  }

  const handleDeleteReply = async (replyId) => {
    if (hasSubmitted) {
      alert('已提交数据，无法删除')
      return
    }
    
    if (!window.confirm('确定要删除这条回复吗？')) {
      return
    }

    if (!marketId) {
      alert('市场ID不存在')
      return
    }

    try {
      await onDeleteReply(marketId, fieldName, replyId)
      await loadReplies() // 重新加载回复列表
    } catch (error) {
      console.error('删除回复失败:', error)
    }
  }

  // 如果只显示当前用户的回复，过滤回复列表
  const filteredReplies = showOnlyCurrentUser && currentUser
    ? replies.filter(reply => reply.userId === currentUser.id)
    : replies
  
  const replyCount = filteredReplies.length
  
  // 如果是只读模式且有回复，自动展开
  // 注意：这个 useEffect 必须在早期返回之前，以保持 Hooks 调用顺序一致
  useEffect(() => {
    if (readOnly && replyCount > 0) {
      setExpanded(true)
    }
  }, [readOnly, replyCount])

  // 早期返回必须在所有 Hooks 之后
  if (loading || !marketId) {
    return null
  }
  
  // 获取已选择的选项文本（用于显示）
  const getSelectedOptionsText = () => {
    if (!useOptions || selectedOptions.length === 0) {
      return null
    }
    const selectedLabels = selectedOptions.map(optValue => {
      if (optValue === 'other') {
        return otherText.trim() ? `其他：${otherText.trim()}` : '其他'
      }
      const choice = OPTION_CHOICES.find(opt => opt.value === optValue)
      return choice ? choice.label : optValue
    })
    return selectedLabels.join('，')
  }
  
  const selectedOptionsText = getSelectedOptionsText()
  const hasPendingSelection = useOptions && selectedOptions.length > 0

  return (
    <div className="field-reply-container">
      {!readOnly && (
        <div className="field-reply-header">
          <button
            className="field-reply-toggle"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            回复 ({replyCount})
          </button>
          {replyCount > 0 && (
            <button
              className="field-reply-expand"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>
      )}
      {readOnly && replyCount > 0 && (
        <div className="field-reply-header">
          <span className="field-reply-count">回复 ({replyCount})</span>
          <button
            className="field-reply-expand"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      )}
      
      {/* 显示已选择的选项（选项模式下，非只读模式） */}
      {!readOnly && hasPendingSelection && !showReplyForm && (
        <div className="field-reply-selected">
          <span className="field-reply-selected-label">已选择：</span>
          <span className="field-reply-selected-text">{selectedOptionsText}</span>
          {!hasSubmitted && (
            <button
              className="field-reply-edit"
              onClick={() => {
                setShowReplyForm(true)
              }}
            >
              修改
            </button>
          )}
        </div>
      )}

      {!readOnly && showReplyForm && (
        <div className="field-reply-form">
          {useOptions ? (
            <>
              <div className="field-reply-options">
                {OPTION_CHOICES.map((option) => (
                  <label key={option.value} className="field-reply-option-label">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={selectedOptions.includes(option.value)}
                      onChange={() => handleOptionChange(option.value)}
                      disabled={hasSubmitted}
                      className="field-reply-option-input"
                    />
                    <span className="field-reply-option-text">{option.label}</span>
                  </label>
                ))}
              </div>
              {selectedOptions.includes('other') && (
                <textarea
                  value={otherText}
                  onChange={(e) => {
                    if (hasSubmitted) {
                      alert('已提交数据，无法修改')
                      return
                    }
                    setOtherText(e.target.value)
                  }}
                  disabled={hasSubmitted}
                  className="field-reply-input"
                  placeholder="请说明其他原因..."
                  rows="2"
                />
              )}
            </>
          ) : (
            <textarea
              value={replyText}
              onChange={(e) => {
                if (hasSubmitted) {
                  alert('已提交数据，无法修改')
                  return
                }
                setReplyText(e.target.value)
              }}
              disabled={hasSubmitted}
              className="field-reply-input"
              placeholder={`对"${fieldLabel}"进行回复...`}
              rows="1"
            />
          )}
          {!useOptions && (
            <div className="field-reply-form-actions">
              <button
                onClick={handleSubmitReply}
                className="field-reply-submit"
                disabled={hasSubmitted}
              >
                发送
              </button>
              <button
                onClick={() => {
                  setShowReplyForm(false)
                  setReplyText('')
                  setSelectedOptions([])
                  setOtherText('')
                }}
                className="field-reply-cancel"
                disabled={hasSubmitted}
              >
                取消
              </button>
            </div>
          )}
          {useOptions && (
            <div className="field-reply-form-actions">
              <button
                onClick={() => {
                  if (hasSubmitted) {
                    alert('已提交数据，无法修改')
                    return
                  }
                  // 选项模式下，选择后自动关闭表单（但保留选择）
                  setShowReplyForm(false)
                }}
                className="field-reply-cancel"
                disabled={hasSubmitted}
              >
                完成
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && replyCount > 0 && (
        <div className="field-reply-list">
          {filteredReplies.map((reply) => {
            const isOwner = currentUser && reply.userId === currentUser.id
            const isAdmin = currentUser && currentUser.isAdmin
            const canDelete = isOwner || isAdmin

            return (
              <div key={reply.id} className="field-reply-item">
                <div className="field-reply-content">
                  <div className="field-reply-header-info">
                    <span className="field-reply-user-name">{reply.userName}</span>
                    <span className="field-reply-time">
                      {formatTime(reply.timestamp)}
                    </span>
                  </div>
                  <p className="field-reply-text">{reply.comment}</p>
                  <div className="field-reply-actions">
                    {canDelete && !hasSubmitted && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="field-reply-delete"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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

export default FieldReply

