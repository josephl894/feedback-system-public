import { useState } from 'react'
import './RatingStars.css'

function RatingStars({ marketId, currentUser, userRating, onRate, disabled = false }) {
  const [hoverRating, setHoverRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async (rating) => {
    if (disabled || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onRate(marketId, rating)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStarClick = (starIndex) => {
    handleClick(starIndex)
  }

  const handleStarHover = (starIndex) => {
    if (disabled) return
    setHoverRating(starIndex)
  }

  const displayRating = hoverRating || userRating || 0

  // 获取评分标签
  const getRatingLabel = (rating) => {
    if (rating === 1) return '一般'
    if (rating === 2) return '良好'
    if (rating === 3) return '优秀'
    return ''
  }

  // 渲染星星（只支持整星，3颗星）
  const renderStar = (starIndex) => {
    const isActive = displayRating >= starIndex

    // 确定wrapper的类名
    let wrapperClass = 'star-wrapper'
    if (isActive) {
      wrapperClass += ' full-active'
    }

    return (
      <div key={starIndex} className={wrapperClass}>
        <button
          type="button"
          className="star-button"
          onClick={() => handleStarClick(starIndex)}
          onMouseEnter={() => handleStarHover(starIndex)}
          disabled={disabled || isSubmitting}
          title={`${starIndex} 星 - ${getRatingLabel(starIndex)}`}
        >
        </button>
      </div>
    )
  }

  return (
    <div className="rating-stars-container">
      <div className="rating-stars" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3].map(starIndex => renderStar(starIndex))}
      </div>
      {userRating > 0 && (
        <span className="user-rating-text">
          您已评分: {userRating} 星 ({getRatingLabel(userRating)})
        </span>
      )}
      {isSubmitting && (
        <span className="submitting-text">提交中...</span>
      )}
    </div>
  )
}

export default RatingStars

