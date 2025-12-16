import { useState, useEffect } from 'react'
import axios from 'axios'
import MarketCard from './MarketCard'
import { getMarkets, getFeedbacksByDate, getRankings } from '../utils/apiClient'
import { getToday, formatDate } from '../utils/dateUtils'
import { USE_EXTERNAL_API, USE_LOCAL_FEEDBACK, USE_LOCAL_RANKINGS } from '../config/apiConfig'
import './AllSubmissionsView.css'

function AllSubmissionsView({ user, selectedDate, onBack }) {
  const [markets, setMarkets] = useState([])
  const [rankings, setRankings] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const date = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      console.log('📊 [所有提交数据] 加载数据，日期:', date);

      // 加载市场数据
      let marketsData = []
      const useLocalForTest = date === '2025-12-04'
      
      if (USE_EXTERNAL_API && !useLocalForTest) {
        try {
          console.log('📊 [所有提交数据] 从外部API获取市场数据，日期:', date);
          marketsData = await getMarkets({ date })
          console.log('📊 [所有提交数据] 外部API返回市场数据:', marketsData?.length || 0, '条');
          if (marketsData && marketsData.length > 0) {
            console.log('📊 [所有提交数据] 第一条市场数据示例:', JSON.stringify(marketsData[0]).substring(0, 200));
            // 转换外部API数据格式为MarketCard期望的格式
            marketsData = marketsData.map(market => ({
              ...market,
              'Market ID': market.market_id || market['Market ID'] || market.marketId || market.id,
              marketId: market.market_id || market.marketId || market.id,
              Question: market.question || market.Question,
              question: market.question || market.Question,
              Description: market.description || market.Description,
              Options: Array.isArray(market.options) ? market.options.join(', ') : (market.Options || market.options || ''),
              'Resolution Date': market.resolution_date || market['Resolution Date'],
              'Resolution Rule': market.resolution_rule || market['Resolution Rule'],
              Category: market.category || market.Category
            }));
            console.log('📊 [所有提交数据] 数据格式转换完成');
          }
        } catch (error) {
          console.error('❌ [所有提交数据] 外部API失败，尝试本地API:', error.message)
          try {
            const response = await axios.get(`/api/markets?date=${date}`)
            marketsData = response.data || []
            console.log('📊 [所有提交数据] 本地API返回市场数据:', marketsData?.length || 0, '条');
          } catch (localError) {
            console.error('❌ [所有提交数据] 本地API也失败:', localError.message)
            marketsData = []
          }
        }
      } else {
        console.log('📊 [所有提交数据] 从本地API获取市场数据');
        try {
          const response = await axios.get(`/api/markets?date=${date}`)
          marketsData = response.data || []
          console.log('📊 [所有提交数据] 本地API返回市场数据:', marketsData?.length || 0, '条');
        } catch (error) {
          console.error('❌ [所有提交数据] 本地API获取市场数据失败:', error.message)
          // 如果本地API失败，尝试外部API
          if (USE_EXTERNAL_API) {
            try {
              console.log('📊 [所有提交数据] 尝试从外部API获取市场数据，日期:', date);
              marketsData = await getMarkets({ date })
              console.log('📊 [所有提交数据] 外部API返回市场数据:', marketsData?.length || 0, '条');
              if (marketsData && marketsData.length > 0) {
                console.log('📊 [所有提交数据] 第一条市场数据示例:', JSON.stringify(marketsData[0]).substring(0, 200));
              }
            } catch (externalError) {
              console.error('❌ [所有提交数据] 外部API也失败:', externalError.message)
              marketsData = []
            }
          } else {
            marketsData = []
          }
        }
      }

      console.log('📊 [所有提交数据] 初步市场数据数量:', marketsData?.length || 0);
      
      // 如果市场数据为空，但排名数据中有marketId，尝试从外部API获取这些市场的详细信息
      if ((!marketsData || marketsData.length === 0)) {
        console.warn('⚠️ [所有提交数据] 没有市场数据，尝试从排名数据中获取市场ID');
        
        // 先加载排名数据，看看有哪些市场
        try {
          const rankingsUrl = `/api/rankings?date=${date}`
          const rankingsResponse = await axios.get(rankingsUrl)
          const tempRankings = rankingsResponse.data || []
          
          if (tempRankings.length > 0) {
            const marketIdsFromRankings = tempRankings.map(r => r.marketId || r.market_id).filter(Boolean)
            console.log('📊 [所有提交数据] 从排名数据中获取到市场ID:', marketIdsFromRankings.length, '个');
            
            // 尝试从外部API获取这些市场的详细信息
            if (USE_EXTERNAL_API && marketIdsFromRankings.length > 0) {
              try {
                const marketsFromExternal = await getMarkets({ date })
                console.log('📊 [所有提交数据] 外部API返回的市场数据总数:', marketsFromExternal?.length || 0, '条');
                
                if (marketsFromExternal && marketsFromExternal.length > 0) {
                  // 过滤出有排名的市场
                  const filteredMarkets = marketsFromExternal.filter(m => {
                    const mId = m['Market ID'] || m.marketId || m.id
                    return marketIdsFromRankings.includes(mId)
                  })
                  console.log('📊 [所有提交数据] 匹配到的市场数据:', filteredMarkets.length, '条');
                  
                  if (filteredMarkets.length > 0) {
                    marketsData = filteredMarkets
                  } else {
                    // 如果外部API的市场数据与排名数据不匹配，创建基于排名数据的虚拟市场数据
                    console.warn('⚠️ [所有提交数据] 外部API市场数据与排名数据不匹配，创建基于排名数据的虚拟市场数据');
                    marketsData = tempRankings.map((ranking, index) => {
                      const marketId = ranking.marketId || ranking.market_id;
                      return {
                        'Market ID': marketId,
                        marketId: marketId,
                        id: marketId,
                        Question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                        question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                        // 从排名数据中获取其他信息
                        averageRating: ranking.averageRating || ranking.average_rating,
                        ratingCount: ranking.ratingCount || ranking.rating_count,
                        rank: ranking.rank
                      };
                    });
                  }
                } else {
                  // 外部API没有市场数据，创建基于排名数据的虚拟市场数据
                  console.log('📊 [所有提交数据] 外部API没有市场数据，创建基于排名数据的虚拟市场数据');
                  marketsData = tempRankings.map((ranking, index) => {
                    const marketId = ranking.marketId || ranking.market_id;
                    return {
                      'Market ID': marketId,
                      marketId: marketId,
                      id: marketId,
                      Question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                      question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                      averageRating: ranking.averageRating || ranking.average_rating,
                      ratingCount: ranking.ratingCount || ranking.rating_count,
                      rank: ranking.rank
                    };
                  });
                }
              } catch (error) {
                console.error('❌ [所有提交数据] 从外部API获取市场数据失败:', error.message)
                // 如果外部API失败，创建基于排名数据的虚拟市场数据
                console.log('📊 [所有提交数据] 外部API失败，创建基于排名数据的虚拟市场数据');
                marketsData = tempRankings.map((ranking, index) => {
                  const marketId = ranking.marketId || ranking.market_id;
                  return {
                    'Market ID': marketId,
                    marketId: marketId,
                    id: marketId,
                    Question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                    question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                    averageRating: ranking.averageRating || ranking.average_rating,
                    ratingCount: ranking.ratingCount || ranking.rating_count,
                    rank: ranking.rank
                  };
                });
              }
            } else if (marketIdsFromRankings.length > 0) {
              // 如果不使用外部API，直接创建基于排名数据的虚拟市场数据
              console.log('📊 [所有提交数据] 不使用外部API，创建基于排名数据的虚拟市场数据');
              marketsData = tempRankings.map((ranking, index) => {
                const marketId = ranking.marketId || ranking.market_id;
                return {
                  'Market ID': marketId,
                  marketId: marketId,
                  id: marketId,
                  Question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                  question: ranking.question || ranking.Question || `市场 ${index + 1}`,
                  averageRating: ranking.averageRating || ranking.average_rating,
                  ratingCount: ranking.ratingCount || ranking.rating_count,
                  rank: ranking.rank
                };
              });
            }
          }
        } catch (error) {
          console.error('❌ [所有提交数据] 获取排名数据失败:', error.message)
        }
      }
      
      console.log('📊 [所有提交数据] 最终市场数据数量:', marketsData?.length || 0);
      if (!marketsData || marketsData.length === 0) {
        console.warn('⚠️ [所有提交数据] 最终没有市场数据，页面将显示为空');
      }
      setMarkets(marketsData || [])

      // 加载排名数据（优先本地API，如果本地没有再尝试外部API）
      // 获取marketId用于加载排名数据
      let marketIds = marketsData.map(m => m['Market ID'] || m.marketId || m.id).filter(Boolean)
      
      // 如果市场数据为空，尝试从排名数据中获取marketId
      if (marketIds.length === 0) {
        console.log('📊 [所有提交数据] 市场数据为空，尝试从排名数据中获取marketId');
        try {
          const rankingsUrl = `/api/rankings?date=${date}`
          const rankingsResponse = await axios.get(rankingsUrl)
          const tempRankings = rankingsResponse.data || []
          marketIds = tempRankings.map(r => r.marketId || r.market_id).filter(Boolean)
          console.log('📊 [所有提交数据] 从排名数据中获取到marketId:', marketIds.length, '个');
        } catch (error) {
          console.error('❌ [所有提交数据] 获取排名数据失败:', error.message)
        }
      }
      
      if (marketIds.length > 0) {
        let rankingsData = [];
        
        // 优先使用本地API（因为用户已提交的数据在本地）
        if (!useLocalForTest) {
          try {
            const rankingsUrl = `/api/rankings?date=${date}&marketIds=${marketIds.join(',')}`
            const rankingsResponse = await axios.get(rankingsUrl)
            rankingsData = rankingsResponse.data || []
            console.log('📊 [所有提交数据] 从本地API获取排名数据:', rankingsData.length, '条');
          } catch (error) {
            console.log('📊 [所有提交数据] 本地API没有排名数据，尝试外部API');
            // 本地API没有数据，尝试外部API
            if (!USE_LOCAL_RANKINGS) {
              try {
                rankingsData = await getRankings({
                  date,
                  marketIds
                });
                console.log('📊 [所有提交数据] 从外部API获取排名数据:', rankingsData.length, '条');
              } catch (externalError) {
                // 404是正常的，表示该日期没有排名数据
                if (externalError.response?.status === 404) {
                  console.log('📊 [所有提交数据] 外部API也没有排名数据（404是正常的）');
                } else {
                  console.error('📊 [所有提交数据] 从外部API加载排名数据失败:', externalError);
                }
                rankingsData = [];
              }
            } else {
              rankingsData = [];
            }
          }
        } else {
          // 12.4特殊处理，只使用本地API
          try {
            const rankingsUrl = `/api/rankings?date=${date}&marketIds=${marketIds.join(',')}`
            const rankingsResponse = await axios.get(rankingsUrl)
            rankingsData = rankingsResponse.data || []
            console.log('📊 [所有提交数据] 从本地API获取排名数据（12.4）:', rankingsData.length, '条');
          } catch (error) {
            console.log('📊 [所有提交数据] 本地API没有排名数据');
            rankingsData = [];
          }
        }
        
        // 转换为 Map 格式
        const rankingsMap = {};
        rankingsData.forEach(item => {
          const key = item.marketId || item.market_id;
          if (key) {
            rankingsMap[key] = item;
          }
        });
        
        console.log('📊 [所有提交数据] 排名数据:', Object.keys(rankingsMap).length, '个市场');
        setRankings(rankingsMap);
      }

      // 加载反馈数据（同时从本地和外部API获取，合并数据）
      try {
        let feedbackData = {};
        let localFeedbackData = {};
        let externalFeedbackData = {};
        
        // 1. 从本地API获取反馈数据（用户已提交的数据）
        if (!useLocalForTest) {
          try {
            const feedbackResponse = await axios.get(`/api/feedback?date=${date}`)
            localFeedbackData = feedbackResponse.data || {}
            console.log('💬 [所有提交数据] 从本地API获取反馈数据:', Object.keys(localFeedbackData).length, '个市场');
          } catch (error) {
            console.log('💬 [所有提交数据] 本地API没有反馈数据（这是正常的）');
          }
        }
        
        // 2. 从外部API获取反馈数据（其他用户提交的数据）
        if (!useLocalForTest && !USE_LOCAL_FEEDBACK) {
          try {
            const response = await getFeedbacksByDate(date);
            // 将反馈数据按market_id分组
            const reviews = response?.reviews || [];
            reviews.forEach(review => {
              const marketId = review.market_id;
              if (!externalFeedbackData[marketId]) {
                externalFeedbackData[marketId] = [];
              }
              externalFeedbackData[marketId].push(review);
            });
            console.log('💬 [所有提交数据] 从外部API获取反馈数据:', Object.keys(externalFeedbackData).length, '个市场');
          } catch (error) {
            // 404是正常的，表示该日期没有反馈数据
            if (error.response?.status === 404) {
              console.log('💬 [所有提交数据] 外部API没有反馈数据（404是正常的）');
            } else {
              console.error('💬 [所有提交数据] 从外部API加载反馈数据失败:', error);
            }
          }
        }
        
        // 3. 合并本地和外部数据
        // 先添加外部数据
        Object.keys(externalFeedbackData).forEach(marketId => {
          feedbackData[marketId] = [...(externalFeedbackData[marketId] || [])];
        });
        
        // 再添加本地数据（合并到现有数组中）
        Object.keys(localFeedbackData).forEach(marketId => {
          if (!feedbackData[marketId]) {
            feedbackData[marketId] = [];
          }
          feedbackData[marketId] = [...feedbackData[marketId], ...(localFeedbackData[marketId] || [])];
        });
        
        console.log('💬 [所有提交数据] 合并后的反馈数据:', Object.keys(feedbackData).length, '个市场');
        setFeedback(feedbackData);
      } catch (error) {
        console.error('加载反馈数据失败:', error)
        setFeedback({})
      }

    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="all-submissions-view">
      <header className="all-submissions-header">
        <div className="header-content">
          <h1>所有提交数据</h1>
          <div className="header-actions">
            <button onClick={onBack} className="back-button">
              ← 返回
            </button>
            <div className="user-info">
              <img src={user.avatar} alt={user.name} className="user-avatar" />
              <span className="user-name">{user.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="all-submissions-main">
        <div className="info-banner">
          <p>📊 此页面显示所有用户提交的数据，卡片颜色根据平均分显示</p>
        </div>
        <div className="markets-container">
          {(() => {
            console.log('🎨 [所有提交数据] 渲染市场列表，markets数量:', markets?.length || 0);
            if (!markets || markets.length === 0) {
              console.warn('⚠️ [所有提交数据] markets为空，显示提示信息');
              return (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  <p>暂无市场数据</p>
                  <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
                    请检查：
                    <br />1. 是否选择了正确的日期
                    <br />2. 该日期是否有市场数据
                    <br />3. 查看浏览器控制台的日志信息
                  </p>
                </div>
              );
            }
            // 按照排名排序市场数据
            const sortedMarkets = [...markets].sort((a, b) => {
              const aId = a['Market ID'] || a.marketId || a.id;
              const bId = b['Market ID'] || b.marketId || b.id;
              const aRanking = rankings[aId];
              const bRanking = rankings[bId];
              
              const aRank = aRanking?.rank || a.Rank || 999999; // 没有排名的放在最后
              const bRank = bRanking?.rank || b.Rank || 999999;
              
              // 按照排名升序排列（排名越小越靠前）
              return aRank - bRank;
            });
            
            console.log('📊 [所有提交数据] 排序后的市场列表:', sortedMarkets.map(m => {
              const mId = m['Market ID'] || m.marketId || m.id;
              const ranking = rankings[mId];
              return {
                marketId: mId,
                rank: ranking?.rank || m.Rank || '无排名'
              };
            }));
            
            return sortedMarkets.map((market, index) => {
              const marketId = market['Market ID'] || market.marketId || market.id
              const marketRanking = rankings[marketId]
              
              // 将排名信息添加到market对象中，以便MarketCard显示排名编号
              const marketWithRank = {
                ...market,
                Rank: marketRanking?.rank || market.Rank || null
              }
              
              return (
                <MarketCard
                  key={marketId || index}
                  market={marketWithRank}
                  feedbacks={feedback[marketId] || []}
                  ranking={marketRanking}
                  selectedDate={selectedDate}
                  currentUser={user}
                  onAddFeedback={() => {}}
                  onUpdateFeedback={() => {}}
                  onDeleteFeedback={() => {}}
                  onRate={() => {}}
                  onAddReply={() => {}}
                  onDeleteReply={() => {}}
                  onAddFieldReply={() => {}}
                  onDeleteFieldReply={() => {}}
                  pendingRating={null}
                  pendingFieldReplies={{}}
                  hasSubmitted={true}
                  useAverageRatingForColor={true}
                  readOnly={true}
                />
              )
            })
          })()}
        </div>
      </main>
    </div>
  )
}

export default AllSubmissionsView

