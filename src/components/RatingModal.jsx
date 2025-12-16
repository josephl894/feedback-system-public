import { useState, useEffect } from 'react'
import axios from 'axios'
import { formatDate, getToday } from '../utils/dateUtils'
import { getRankings } from '../utils/apiClient'
import { USE_LOCAL_RANKINGS } from '../config/apiConfig'
import './RatingModal.css'

function RatingModal({ isOpen, onClose, markets, currentUser, onRate, selectedDate, hasSubmitted = false }) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && hasSubmitted) {
      loadRankings()
      // 每3秒刷新一次排名
      const interval = setInterval(loadRankings, 3000)
      return () => clearInterval(interval)
    } else if (isOpen && !hasSubmitted) {
      setLoading(false)
    }
  }, [isOpen, selectedDate, markets, hasSubmitted])

  const loadRankings = async () => {
    try {
      // 获取当前市场数据中的所有marketId
      const currentMarketIds = markets?.map(m => m['Market ID'] || m.marketId || m.id) || [];
      
      if (currentMarketIds.length === 0) {
        console.log('⚠️ [排名弹窗] 没有市场数据，跳过获取排名');
        setRankings([]);
        setLoading(false);
        return;
      }
      
      const dateStr = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      // 检查是否使用本地排名数据（12.4特殊处理）
      const useLocalForTest = dateStr === '2025-12-04';
      
      let rankingsData = [];
      
      // 优先使用本地API（因为用户已提交的数据在本地）
      // 如果本地API没有数据，再尝试外部API
      if (USE_LOCAL_RANKINGS || useLocalForTest || hasSubmitted) {
        // 使用本地API
        console.log('📊 [排名弹窗] 从本地API获取排名' + (useLocalForTest ? '（12.4特殊处理）' : hasSubmitted ? '（用户已提交，数据在本地）' : ''));
        const rankingsUrl = dateStr
          ? `/api/rankings?date=${dateStr}&marketIds=${currentMarketIds.join(',')}`
          : `/api/rankings?marketIds=${currentMarketIds.join(',')}`;
        
        console.log('📊 [排名弹窗] 请求URL:', rankingsUrl);
        try {
          const response = await axios.get(rankingsUrl);
          rankingsData = response.data || [];
          console.log('📊 [排名弹窗] 本地API返回数据数量:', rankingsData.length);
        } catch (error) {
          console.error('📊 [排名弹窗] 本地API获取排名失败:', error);
          rankingsData = [];
          
          // 如果本地API失败且不是12.4，尝试外部API
          if (!useLocalForTest && !USE_LOCAL_RANKINGS) {
            console.log('📊 [排名弹窗] 本地API失败，尝试外部API');
            try {
              rankingsData = await getRankings({
                date: dateStr,
                marketIds: currentMarketIds
              });
              console.log('📊 [排名弹窗] 外部API返回数据数量:', rankingsData.length);
            } catch (externalError) {
              if (externalError.response?.status === 404) {
                console.log('📊 [排名弹窗] 外部API也没有排名数据（404是正常的）');
              } else {
                console.error('📊 [排名弹窗] 外部API获取排名失败:', externalError);
              }
              rankingsData = [];
            }
          }
        }
      } else {
        // 先尝试外部API，如果失败再尝试本地API
        console.log('📊 [排名弹窗] 从外部API获取排名');
        try {
          rankingsData = await getRankings({
            date: dateStr,
            marketIds: currentMarketIds
          });
          console.log('📊 [排名弹窗] 外部API返回数据数量:', rankingsData.length);
        } catch (error) {
          // 404是正常的，表示该日期没有排名数据
          if (error.response?.status === 404) {
            console.log('📊 [排名弹窗] 外部API没有排名数据，尝试本地API');
            // 外部API没有数据，尝试本地API
            try {
              const rankingsUrl = dateStr
                ? `/api/rankings?date=${dateStr}&marketIds=${currentMarketIds.join(',')}`
                : `/api/rankings?marketIds=${currentMarketIds.join(',')}`;
              const response = await axios.get(rankingsUrl);
              rankingsData = response.data || [];
              console.log('📊 [排名弹窗] 本地API返回数据数量:', rankingsData.length);
            } catch (localError) {
              console.error('📊 [排名弹窗] 本地API也获取失败:', localError);
              rankingsData = [];
            }
          } else {
            console.error('📊 [排名弹窗] 外部API获取排名失败:', error);
            rankingsData = [];
          }
        }
      }
      
      console.log('📊 [排名弹窗] 获取到排名数据数量:', rankingsData?.length || 0);
      if (rankingsData.length > 0) {
        console.log('📊 [排名弹窗] 第一条排名数据:', rankingsData[0]);
      }
      
      setRankings(rankingsData);
    } catch (error) {
      console.error('加载排名失败:', error);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }

  // 根据平均分获取评级标签
  const getRatingLabel = (averageRating) => {
    const avg = Number(averageRating)
    if (avg >= 2.5) {
      return { text: '优秀', class: 'excellent' }
    } else if (avg >= 1.5) {
      return { text: '良好', class: 'good' }
    } else if (avg >= 1.0) {
      return { text: '一般', class: 'average' }
    }
    return null
  }

  if (!isOpen) return null

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="rating-modal-header">
          <h2>实时排名</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="rating-modal-body">
          {!hasSubmitted ? (
            <div className="no-rankings">请提交数据后查看排名</div>
          ) : loading ? (
            <div className="loading-text">加载中...</div>
          ) : rankings.length === 0 ? (
            <div className="no-rankings">暂无评分数据</div>
          ) : (
            <div className="rankings-list">
              {rankings.map((item, index) => {
                // 从markets数据中查找对应的市场，获取标题
                const marketId = item.marketId || item.market_id;
                
                // 调试日志（只在第一条数据时输出）
                if (index === 0) {
                  console.log('🔍 [排名显示] 第一条排名数据:', item);
                  console.log('🔍 [排名显示] markets数据数量:', markets?.length || 0);
                  if (markets && markets.length > 0) {
                    console.log('🔍 [排名显示] 第一个market示例:', {
                      'Market ID': markets[0]['Market ID'],
                      marketId: markets[0].marketId,
                      id: markets[0].id,
                      Question: markets[0].Question
                    });
                  }
                }
                
                // 尝试多种方式匹配marketId
                const market = markets?.find(m => {
                  const mId = m['Market ID'] || m.marketId || m.id;
                  // 精确匹配
                  if (mId === marketId) return true;
                  // 忽略大小写匹配
                  if (mId && marketId && mId.toLowerCase() === marketId.toLowerCase()) return true;
                  return false;
                });
                
                if (index === 0) {
                  console.log('🔍 [排名显示] 查找marketId:', marketId);
                  console.log('🔍 [排名显示] 找到的market:', market ? '✅ 找到' : '❌ 未找到');
                  if (market) {
                    console.log('🔍 [排名显示] market.Question:', market.Question || market.question || '缺失');
                  } else {
                    console.log('🔍 [排名显示] 所有markets的ID:', markets?.slice(0, 3).map(m => ({
                      'Market ID': m['Market ID'],
                      marketId: m.marketId,
                      id: m.id
                    })));
                  }
                }
                
                // 优先从markets中获取真实的Question，如果排名数据中的question是默认值则忽略
                let question = null;
                
                // 先尝试从markets中获取
                if (market) {
                  question = market.Question || market.question || market['Question'];
                  if (index === 0) {
                    console.log('🔍 [排名显示] 从market获取question:', question);
                  }
                }
                
                // 如果markets中没有找到，尝试通过market_id匹配
                if (!question && markets && markets.length > 0) {
                  const matchedMarket = markets.find(m => {
                    const mId = m['Market ID'] || m.marketId || m.id || m.market_id;
                    return mId === marketId || (mId && marketId && mId.toLowerCase() === marketId.toLowerCase());
                  });
                  if (matchedMarket) {
                    question = matchedMarket.Question || matchedMarket.question || matchedMarket['Question'];
                    if (index === 0) {
                      console.log('🔍 [排名显示] 通过market_id匹配找到question:', question);
                    }
                  }
                }
                
                // 如果markets中都没有，检查排名数据中的question是否是真实标题（不是默认的"市场 {marketId}"格式）
                if (!question) {
                  const rankingQuestion = item.question || item.Question;
                  // 如果排名数据中的question不是默认格式，使用它
                  if (rankingQuestion && !rankingQuestion.startsWith('市场 ') && rankingQuestion !== `市场 ${marketId}`) {
                    question = rankingQuestion;
                    if (index === 0) {
                      console.log('🔍 [排名显示] 使用排名数据中的真实question:', question);
                    }
                  }
                }
                
                // 最后使用默认值
                if (!question) {
                  question = `市场 ${marketId}`;
                  if (index === 0) {
                    console.log('🔍 [排名显示] 使用默认question:', question);
                  }
                }
                
                if (index === 0) {
                  console.log('🔍 [排名显示] 最终使用的question:', question);
                  console.log('🔍 [排名显示] markets数据:', markets?.slice(0, 2).map(m => ({
                    'Market ID': m['Market ID'],
                    marketId: m.marketId,
                    market_id: m.market_id,
                    Question: m.Question,
                    question: m.question
                  })));
                }
                
                // 兼容不同的字段名
                const averageRating = item.averageRating || item.average_rating || 0;
                const ratingCount = item.ratingCount || item.rating_count || 0;
                const ratingLabel = getRatingLabel(averageRating);
                
                return (
                  <div key={marketId || index} className="ranking-item">
                    <div className="ranking-position">
                      <span className="rank-number">{item.rank || index + 1}</span>
                      {item.rank && item.rank <= 3 && <span className="rank-medal">🏆</span>}
                    </div>
                    <div className="ranking-info">
                      <div className="ranking-title">{question}</div>
                      <div className="ranking-stats">
                        <span className="rating-score">平均分: {Number(averageRating).toFixed(2)}</span>
                        <span className="rating-count">({ratingCount}人评分)</span>
                        {ratingLabel && (
                          <span className={`badge ${ratingLabel.class}`}>{ratingLabel.text}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rating-modal-footer">
          <p className="update-info">排名每3秒自动更新</p>
        </div>
      </div>
    </div>
  )
}

export default RatingModal

