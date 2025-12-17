import { useState, useEffect } from 'react'
import FeedbackList from './FeedbackList'
import FeedbackForm from './FeedbackForm'
import RatingStars from './RatingStars'
import FieldReply from './FieldReply'
import axios from 'axios'
import { formatDate, getToday } from '../utils/dateUtils'
import { getReviews } from '../utils/apiClient'
import { USE_EXTERNAL_API } from '../config/apiConfig'
import './MarketCard.css'

function MarketCard({ market, feedbacks, currentUser, onAddFeedback, onUpdateFeedback, onDeleteFeedback, onRate, onAddReply, onDeleteReply, ranking, selectedDate, onAddFieldReply, onDeleteFieldReply, pendingRating, pendingFieldReplies = {}, hasSubmitted = false, useAverageRatingForColor = false, readOnly = false }) {
  const [showForm, setShowForm] = useState(false)
  const [userRating, setUserRating] = useState(pendingRating || 0)
  
  // 当pendingRating变化时更新userRating
  useEffect(() => {
    if (pendingRating !== undefined) {
      setUserRating(pendingRating)
    }
  }, [pendingRating])

  // 根据评分等级确定渐变背景
  // 如果 useAverageRatingForColor 为 true，使用平均分；否则使用用户评分
  const getCardStyle = () => {
    const marketId = market['Market ID'] || market.marketId || market.id;
    
    let ratingForColor = 0
    
    if (useAverageRatingForColor) {
      // 使用平均分来判断颜色
      if (!ranking || !ranking.averageRating || ranking.ratingCount === 0) {
        return {}
      }
      const avgRating = Number(ranking.averageRating)
      
      // 根据平均分确定颜色（三颗星系统：>=2.5=优秀，>=1.5=良好，>=1.0=一般）
      if (avgRating >= 2.5) {
        return {
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
          border: '2px solid #10b981'
        }
      } else if (avgRating >= 1.5) {
        return {
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
          border: '2px solid #3b82f6'
        }
      } else if (avgRating >= 1.0) {
        return {
          background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
          border: '2px solid #f59e0b'
        }
      }
      return {}
    } else {
      // 使用用户评分来判断颜色
      // 如果用户没有评分，不显示颜色变化
      if (!userRating || userRating === 0) {
        return {}
      }

      ratingForColor = Number(userRating)

      // 调试日志
      const avgRating = ranking && ranking.averageRating ? Number(ranking.averageRating) : 0
      console.log(`🎨 [颜色判断] Market ID: ${marketId}, userRating: ${userRating}, avgRating: ${avgRating}, hasRanking: ${!!ranking}`);

      // 根据用户评分确定渐变背景（三颗星系统：1星=一般，2星=良好，3星=优秀）
      // 优秀：用户评分 = 3
      if (ratingForColor === 3) {
        console.log(`  ✅ 优秀（绿色）`);
        return {
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)',
          border: '2px solid #10b981'
        }
      }
      // 良好：用户评分 = 2
      else if (ratingForColor === 2) {
        console.log(`  ✅ 良好（蓝色）`);
        return {
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
          border: '2px solid #3b82f6'
        }
      }
      // 一般：用户评分 = 1
      else if (ratingForColor === 1) {
        console.log(`  ✅ 一般（橙色）`);
        return {
          background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 50%, #fb923c 100%)',
          border: '2px solid #f59e0b'
        }
      }
      // 其他情况：不显示颜色
      else {
        console.log(`  ⚠️ 用户评分无效，不显示颜色`);
        return {}
      }
    }
  }

  // 判断是否需要显示红色感叹号（三颗星系统：不再需要）
  const showWarningIcon = () => {
    return false
  }

  // 获取评分等级标签（三颗星系统：1星=一般，2星=良好，3星=优秀）
  const getRatingLabel = () => {
    if (!ranking || ranking.ratingCount === 0) return null
    
    const { averageRating } = ranking
    
    if (averageRating >= 2.5) {
      return { text: '优秀', className: 'rating-label-excellent' }
    } else if (averageRating >= 1.5) {
      return { text: '良好', className: 'rating-label-good' }
    } else if (averageRating >= 1.0) {
      return { text: '一般', className: 'rating-label-average' }
    }
    // < 1.0星不显示标签
    return null
  }

  useEffect(() => {
    // 如果有临时评分，使用临时评分；否则从服务器加载
    if (pendingRating !== undefined) {
      setUserRating(pendingRating)
    } else if (currentUser && market['Market ID']) {
      loadUserRating()
    }
  }, [currentUser, market['Market ID'], selectedDate, pendingRating])

  // 当ranking数据更新时，重新计算颜色
  useEffect(() => {
    if (ranking && userRating > 0) {
      const marketId = market['Market ID'] || market.marketId || market.id;
      console.log(`🔄 [MarketCard] ranking数据更新 - Market ID: ${marketId}, userRating: ${userRating}, avgRating: ${ranking.averageRating}, count: ${ranking.ratingCount}`);
    }
  }, [ranking, userRating])

  const loadUserRating = async () => {
    try {
      const dateStr = selectedDate
        ? formatDate(selectedDate)
        : getToday();

      // 检查是否使用外部API（12.4特殊处理除外）
      const useLocalForTest = dateStr === '2025-12-04';

      let rating = 0;
      if (USE_EXTERNAL_API && !useLocalForTest) {
        // 使用外部API获取评论
        const response = await getReviews({
          market_id: market['Market ID'],
          user_id: currentUser.id,
          date: dateStr
        });
        // 从返回的reviews数组中获取第一条评论记录
        if (response?.reviews && response.reviews.length > 0) {
          rating = response.reviews[0].rating || 0;
        }
      } else {
        // 使用本地API
        const response = await axios.get(`/api/ratings/${market['Market ID']}/${currentUser.id}?date=${dateStr}`);
        rating = response.data.rating || 0;
      }

      // 确保rating是数字类型
      const ratingValue = Number(rating)
      setUserRating(isNaN(ratingValue) ? 0 : ratingValue)
    } catch (error) {
      console.error('加载用户评分失败:', error)
    }
  }

  const handleRate = (marketId, rating) => {
    if (hasSubmitted) {
      alert('已提交数据，无法修改')
      return
    }
    // 直接使用临时状态，不调用API
    const ratingValue = Number(rating)
    setUserRating(isNaN(ratingValue) ? 0 : ratingValue)
    onRate(marketId, rating)
  }

  const handleSubmitFeedback = (comment) => {
    onAddFeedback(market['Market ID'], comment)
    setShowForm(false)
  }

  const cardStyle = getCardStyle()
  const hasWarning = showWarningIcon()

  // 合并默认样式和动态样式，确保内联样式正确应用
  const finalStyle = {
    background: 'white',
    border: '2px solid #e0e0e0',
    ...cardStyle // 动态样式会覆盖默认样式
  }

  return (
    <div className="market-card" style={finalStyle}>
      {hasWarning && (
        <div className="warning-icon-container">
          <span className="warning-icon">⚠️</span>
        </div>
      )}
      <div className="market-header">
        {market.Rank && <span className="market-rank">#{market.Rank}</span>}
        <div className="question-section">
          <h2 className="market-question">{market.Question}</h2>
          {market['Market ID'] && !readOnly && (
            <div className="field-reply-wrapper">
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Question"
                fieldLabel="问题"
                currentUser={currentUser}
                onAddReply={onAddFieldReply}
                onDeleteReply={onDeleteFieldReply}
                useOptions={true}
                pendingValue={pendingFieldReplies['Question']}
                hasSubmitted={hasSubmitted}
                showOnlyCurrentUser={!readOnly}
              />
              {!hasSubmitted && !pendingFieldReplies['Question'] && userRating !== 3 && (
                <span className="required-hint">* 必填</span>
              )}
            </div>
          )}
          {market['Market ID'] && readOnly && (
            <div className="field-reply-wrapper">
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Question"
                fieldLabel="问题"
                currentUser={currentUser}
                onAddReply={() => {}}
                onDeleteReply={() => {}}
                useOptions={true}
                pendingValue={null}
                hasSubmitted={true}
                readOnly={true}
              />
            </div>
          )}
        </div>
        {/* 隐藏排名和评分信息，不显示给其他用户 */}
      </div>

      <div className="market-content">
        <div className="market-field compact-field">
          <span className="field-label">描述：</span>
          <span className="field-value">{market.Description}</span>
          {market['Market ID'] && !readOnly && (
            <div className="field-reply-wrapper">
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Description"
                fieldLabel="描述"
                currentUser={currentUser}
                onAddReply={onAddFieldReply}
                onDeleteReply={onDeleteFieldReply}
                useOptions={true}
                pendingValue={pendingFieldReplies['Description']}
                hasSubmitted={hasSubmitted}
                showOnlyCurrentUser={!readOnly}
              />
              {!hasSubmitted && !pendingFieldReplies['Description'] && userRating !== 3 && (
                <span className="required-hint">* 必填</span>
              )}
            </div>
          )}
          {market['Market ID'] && readOnly && (
            <div className="field-reply-wrapper">
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Description"
                fieldLabel="描述"
                currentUser={currentUser}
                onAddReply={() => {}}
                onDeleteReply={() => {}}
                useOptions={true}
                pendingValue={null}
                hasSubmitted={true}
                readOnly={true}
              />
            </div>
          )}
        </div>

        <div className="market-info-grid">
          <div className="info-item">
            <span className="info-label">解决日期</span>
            <span className="info-value">{market['Resolution Date']}</span>
            {market['Market ID'] && !readOnly && (
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Resolution Date"
                fieldLabel="解决日期"
                currentUser={currentUser}
                onAddReply={onAddFieldReply}
                onDeleteReply={onDeleteFieldReply}
                hasSubmitted={hasSubmitted}
                showOnlyCurrentUser={!readOnly}
              />
            )}
            {market['Market ID'] && readOnly && (
              <FieldReply
                marketId={market['Market ID']}
                fieldName="Resolution Date"
                fieldLabel="解决日期"
                currentUser={currentUser}
                onAddReply={() => {}}
                onDeleteReply={() => {}}
                hasSubmitted={true}
                readOnly={true}
              />
            )}
          </div>

          {market.Options && (
            <div className="info-item">
              <span className="info-label">选项</span>
              <div className="options-inline">
                {(Array.isArray(market.Options) 
                  ? market.Options 
                  : market.Options.split(',')
                ).map((option, index) => (
                  <span key={index} className="option-badge-small">
                    {typeof option === 'string' ? option.trim() : option}
                  </span>
                ))}
              </div>
              {market['Market ID'] && !readOnly && (
                <FieldReply
                  marketId={market['Market ID']}
                  fieldName="Options"
                  fieldLabel="选项"
                  currentUser={currentUser}
                  onAddReply={onAddFieldReply}
                  onDeleteReply={onDeleteFieldReply}
                  hasSubmitted={hasSubmitted}
                  showOnlyCurrentUser={!readOnly}
                />
              )}
              {market['Market ID'] && readOnly && (
                <FieldReply
                  marketId={market['Market ID']}
                  fieldName="Options"
                  fieldLabel="选项"
                  currentUser={currentUser}
                  onAddReply={() => {}}
                  onDeleteReply={() => {}}
                  hasSubmitted={true}
                  readOnly={true}
                />
              )}
            </div>
          )}

        </div>

        <div className="market-field compact-field">
          <span className="field-label">解决规则：</span>
          <span className="field-value rule-text-compact">{market['Resolution Rule']}</span>
          {market['Market ID'] && !readOnly && (
            <FieldReply
              marketId={market['Market ID']}
              fieldName="Resolution Rule"
              fieldLabel="解决规则"
              currentUser={currentUser}
              onAddReply={onAddFieldReply}
              onDeleteReply={onDeleteFieldReply}
              hasSubmitted={hasSubmitted}
              showOnlyCurrentUser={!readOnly}
            />
          )}
          {market['Market ID'] && readOnly && (
            <FieldReply
              marketId={market['Market ID']}
              fieldName="Resolution Rule"
              fieldLabel="解决规则"
              currentUser={currentUser}
              onAddReply={() => {}}
              onDeleteReply={() => {}}
              hasSubmitted={true}
              readOnly={true}
            />
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="rating-section">
          <div className="rating-label-wrapper">
            <div className="rating-label">为这条预测评分：</div>
            {!hasSubmitted && (!userRating || userRating === 0) && (
              <span className="required-hint">* 必填</span>
            )}
          </div>
          <RatingStars
            marketId={market['Market ID']}
            currentUser={currentUser}
            userRating={userRating}
            onRate={handleRate}
            disabled={hasSubmitted}
          />
        </div>
      )}
      {readOnly && ranking && ranking.averageRating && (
        <div className="rating-section">
          <div className="average-rating-display">
            <span className="rating-label">平均分: {ranking.averageRating.toFixed(2)}</span>
            <span className="rating-count">({ranking.ratingCount}人评分)</span>
          </div>
        </div>
      )}

      <div className="feedback-section">
        <div className="feedback-header">
          <h3>总体反馈意见 ({feedbacks.length})</h3>
          {!readOnly && (
            <button
              onClick={() => {
                if (hasSubmitted) {
                  alert('已提交数据，无法修改')
                  return
                }
                setShowForm(!showForm)
              }}
              className="toggle-feedback-button"
              disabled={hasSubmitted}
            >
              {showForm ? '取消' : '添加反馈'}
            </button>
          )}
        </div>

        {!readOnly && showForm && (
          <FeedbackForm onSubmit={handleSubmitFeedback} onCancel={() => setShowForm(false)} />
        )}

        {(hasSubmitted || readOnly) ? (
          <FeedbackList 
            feedbacks={feedbacks} 
            currentUser={currentUser}
            onUpdateFeedback={readOnly ? () => {} : onUpdateFeedback}
            onDeleteFeedback={readOnly ? () => {} : onDeleteFeedback}
            marketId={market['Market ID']}
            onAddReply={readOnly ? () => {} : onAddReply}
            onDeleteReply={readOnly ? () => {} : onDeleteReply}
            hasSubmitted={true}
            showOnlyCurrentUser={!readOnly}
          />
        ) : (
          <div className="no-feedback-message">
            <p>请提交数据后查看其他用户的反馈意见</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarketCard

