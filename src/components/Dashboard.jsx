import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import MarketCard from './MarketCard'
import RatingModal from './RatingModal'
import DatePicker from './DatePicker'
import AllSubmissionsView from './AllSubmissionsView'
import { getMarkets, getFeedbacksByDate, getRankings, upsertReview, getReviews } from '../utils/apiClient'
import { getToday, formatDate } from '../utils/dateUtils'
import { USE_EXTERNAL_API, USE_LOCAL_FEEDBACK, USE_LOCAL_RANKINGS } from '../config/apiConfig'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
  const [markets, setMarkets] = useState([])
  const [feedback, setFeedback] = useState({})
  const [rankings, setRankings] = useState({}) // 存储排名数据，key为marketId
  const [loading, setLoading] = useState(true)
  const [showRankingModal, setShowRankingModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  
  // 临时状态：存储待提交的数据
  const [pendingRatings, setPendingRatings] = useState({}) // { marketId: rating }
  const [pendingFieldReplies, setPendingFieldReplies] = useState({}) // { marketId: { fieldName: comment } }
  const [hasSubmitted, setHasSubmitted] = useState(false) // 是否已提交数据
  const [showAllSubmissions, setShowAllSubmissions] = useState(false) // 是否显示所有提交数据界面

  useEffect(() => {
    // 确保user对象存在
    if (!user || !user.id) {
      console.warn('⚠️ [初始化] 用户对象不存在或用户ID为空，跳过初始化');
      return;
    }
    
    console.log('🔄 [初始化] 开始加载数据，日期:', selectedDate, '用户ID:', user.id, '用户对象:', user);
    // 日期改变时清空临时状态
    setPendingRatings({})
    setPendingFieldReplies({})
    // 重置hasSubmitted，等待检查结果
    setHasSubmitted(false)
    
    // 先检查提交状态，再加载数据
    const initialize = async () => {
      try {
        console.log('🔍 [初始化] 开始检查提交状态...');
        const submitted = await checkSubmissionStatus()
        console.log('📋 [初始化] 提交状态检查结果:', submitted);
        // 确保hasSubmitted状态已更新
        setHasSubmitted(submitted)
        console.log('📋 [初始化] hasSubmitted状态已更新为:', submitted);
        // 使用检查结果来加载数据
        await loadData(submitted)
      } catch (error) {
        console.error('❌ [初始化失败]', error)
        console.error('❌ [初始化失败] 错误堆栈:', error.stack)
        setHasSubmitted(false)
        await loadData(false)
      }
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user?.id])

  // 检查用户是否已提交数据
  const checkSubmissionStatus = async () => {
    try {
      const dateStr = selectedDate
        ? formatDate(selectedDate)
        : getToday();

      console.log('🔍 [检查提交状态] 用户ID:', user.id, '日期:', dateStr);

      // 检查是否使用外部API（12.4特殊处理除外）
      const useLocalForTest = dateStr === '2025-12-04';

      let submitted = false;

      if (USE_EXTERNAL_API && !useLocalForTest) {
        // 使用外部API检查是否有该用户的评论数据
        console.log('📡 [检查提交状态] 使用外部API检查');
        const response = await getReviews({ user_id: user.id, date: dateStr });
        submitted = response?.reviews?.length > 0 || false;
        console.log('✅ [检查提交状态] 外部API响应:', response);
      } else {
        // 使用本地API
        const response = await axios.get(`/api/ratings/check-submission?userId=${user.id}&date=${dateStr}`)
        submitted = response.data.hasSubmitted || false
        console.log('✅ [检查提交状态] 本地API响应:', response.data);
      }

      console.log('✅ [检查提交状态] 提交状态:', submitted);

      setHasSubmitted(submitted)
      return submitted
    } catch (error) {
      console.error('❌ [检查提交状态失败]', error)
      console.error('❌ [检查提交状态失败] 错误详情:', error.response?.data || error.message)
      setHasSubmitted(false)
      return false
    }
  }

  const loadData = async (submittedStatus = null) => {
    console.log('🚀 [loadData] 函数开始执行');
    setLoading(true)
    try {
      // 使用传入的提交状态，如果没有传入则使用当前状态
      const isSubmitted = submittedStatus !== null ? submittedStatus : hasSubmitted
      console.log('📋 [loadData] 用户提交状态:', isSubmitted);
      
      // 根据配置选择使用本地或外部API
      const date = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      console.log('📅 [loadData] 加载数据，日期:', date);
      console.log('🔧 [loadData] API配置:');
      console.log('  - 市场数据:', USE_EXTERNAL_API ? '外部API' : '本地API');
      console.log('  - 反馈数据:', USE_LOCAL_FEEDBACK ? '本地API' : '外部API');
      console.log('  - 排名数据:', USE_LOCAL_RANKINGS ? '本地API' : '外部API');
      
      let marketsData = [];
      let feedbackData = {};
      let rankingsData = [];
      
      // 并行获取所有数据
      const promises = [];
      
      // 1. 获取市场数据（根据配置使用外部或本地API）
      // 注意：12.4作为特殊例子，所有数据都使用本地存储，以便在API维护时继续测试
      const useLocalCSVForTest = date === '2025-12-04';
      const useLocalForTest = useLocalCSVForTest; // 12.4时，所有数据都使用本地
      
      if (useLocalForTest) {
        console.log('🔧 [特殊处理] 12.4日期，强制使用本地存储（市场、反馈、排名）');
      }
      
      // 12.4时强制使用本地CSV，不尝试外部API
      if (useLocalForTest) {
        // 使用本地API（12.4的测试数据）
        console.log('📡 [市场数据] 12.4使用本地CSV数据（测试模式）');
        const marketsUrl = date ? `/api/markets?date=${date}` : '/api/markets';
        console.log('📡 [市场数据] 请求URL:', marketsUrl);
        promises.push(
          axios.get(marketsUrl)
            .then(res => {
              console.log('✅ [市场数据] 12.4本地API响应，数据数量:', res.data?.length || 0);
              return res.data || [];
            })
            .catch(error => {
              console.error('❌ [市场数据] 本地API请求失败:', error);
              console.error('❌ [市场数据] 错误详情:', error.response?.data || error.message);
              return [];
            })
        );
      } else if (USE_EXTERNAL_API) {
        // 非12.4且配置使用外部API时，从外部API获取
        console.log('📡 [市场数据] 从外部API的daily-markets获取市场数据');
        promises.push(
          getMarkets({ date })
            .then(marketsData => {
              console.log('✅ [市场数据] 从daily-markets API获取到的市场数据数量:', marketsData?.length || 0);
              
              // 如果API返回的数据格式与前端期望的格式不同，需要进行转换
              // 假设API返回的数据包含所有必要的字段
              if (marketsData && marketsData.length > 0) {
                // 确保数据格式统一
                const formattedMarkets = marketsData.map((market, index) => {
                  // 如果API返回的数据已经包含所有字段，直接返回
                  // 否则进行字段映射
                  return {
                    'Market ID': market.market_id || market.id || market['Market ID'],
                    id: market.market_id || market.id || market['Market ID'],
                    marketId: market.market_id || market.id || market['Market ID'],
                    Rank: market.rank || market.Rank || (index + 1),
                    Question: market.question || market.Question || market.title || '未知问题',
                    Description: market.description || market.Description || '暂无描述',
                    Category: market.category || market.Category || '未分类',
                    Subcategory: market.subcategory || market.Subcategory || '',
                    'Resolution Date': market.resolution_date || market['Resolution Date'] || date,
                    Options: Array.isArray(market.options) 
                      ? market.options.join(', ') 
                      : (market.Options || market.options || ''),
                    Tags: market.tags || market.Tags || '',
                    Source: market.source || market.Source || '外部API',
                    'Resolution Rule': market.resolution_rule || market['Resolution Rule'] || ''
                  };
                });
                return formattedMarkets;
              }
              
              return marketsData || [];
            })
            .catch(error => {
              console.error('❌ [市场数据] daily-markets API请求失败:', error);
              console.error('❌ [市场数据] 错误详情:', error.response?.data || error.message);
              // 如果外部API失败，尝试使用本地API作为回退
              console.log('⚠️ [市场数据] 外部API失败，尝试使用本地API作为回退');
              const dateStr = selectedDate ? formatDate(selectedDate) : null;
              return axios.get(dateStr ? `/api/markets?date=${dateStr}` : '/api/markets')
                .then(res => res.data || [])
                .catch(localError => {
                  console.error('❌ [市场数据] 本地API回退也失败:', localError);
                  return [];
                });
            })
        );
      } else {
        // 使用本地API（非12.4且配置使用本地API）
        console.log('📡 [市场数据] 从本地API获取');
        promises.push(
          axios.get(selectedDate ? `/api/markets?date=${selectedDate}` : '/api/markets')
            .then(res => res.data || [])
            .catch(error => {
              console.error('❌ [市场数据] 本地API请求失败:', error);
              return [];
            })
        );
      }
      
      // 2. 获取反馈数据（从 feedmarket 表获取）
      // 注意：只有在用户已提交时才加载反馈数据
      // 12.4时强制使用本地存储
      if (!isSubmitted) {
        console.log('⏸️ [反馈数据] 用户未提交，不加载反馈数据');
        promises.push(Promise.resolve({}));
      } else if (USE_LOCAL_FEEDBACK || useLocalForTest) {
        console.log('📡 [反馈数据] 从本地API获取' + (useLocalForTest ? '（12.4特殊处理）' : ''));
        promises.push(
        axios.get('/api/feedback')
            .then(res => res.data || {})
            .catch(error => {
              console.error('❌ [反馈数据] 本地API请求失败:', error);
              // 12.4时如果本地API失败，返回空对象而不是尝试外部API
              if (useLocalForTest) {
                console.log('⚠️ [反馈数据] 12.4本地API失败，返回空数据（不尝试外部API）');
                return {};
              }
              return {};
            })
        );
      } else {
        // 从外部API的feedmarket表获取反馈数据
        console.log('📡 [反馈数据] 从外部API的feedmarket表获取');
        promises.push(
          getFeedbacksByDate(date)
            .then(response => {
              // 将反馈数据按market_id分组
              const grouped = {};
              const reviews = response?.reviews || [];
              reviews.forEach(review => {
                const marketId = review.market_id;
                if (!grouped[marketId]) {
                  grouped[marketId] = [];
                }
                grouped[marketId].push(review);
              });
              return grouped;
            })
            .catch(error => {
              console.error('❌ [反馈数据] 外部API请求失败:', error);
              return {};
            })
        );
      }
      
      // 等待市场数据和反馈数据完成（先不获取排名）
      const [marketsRes, feedbackRes] = await Promise.all(promises);
      
      marketsData = marketsRes || [];
      feedbackData = feedbackRes || {};
      
      console.log('✅ [loadData] 市场数据和反馈数据加载完成:');
      console.log('  - 市场数据数量:', marketsData?.length || 0);
      console.log('  - 反馈数据:', Object.keys(feedbackData || {}).length, '个市场');
      
      // 获取当前市场数据中的所有marketId
      const currentMarketIds = marketsData.map(m => m['Market ID'] || m.marketId || m.id);
      console.log('📊 [排名数据] 当前市场数据中的marketId数量:', currentMarketIds.length);
      console.log('📊 [排名数据] 当前市场数据中的marketId列表:', currentMarketIds);
      
      // 基于市场数据获取排名数据（从 feedmarket 表获取）
      // 注意：只有在用户已提交时才加载排名数据
      // 12.4时强制使用本地存储
      if (!isSubmitted) {
        console.log('⏸️ [排名数据] 用户未提交，不加载排名数据');
        rankingsData = [];
      } else if (currentMarketIds.length > 0) {
        if (USE_LOCAL_RANKINGS || useLocalForTest) {
          console.log('📡 [排名数据] 从本地API获取，只获取当前市场数据的排名' + (useLocalForTest ? '（12.4特殊处理）' : ''));
          const rankingsUrl = selectedDate
            ? `/api/rankings?date=${selectedDate}&marketIds=${currentMarketIds.join(',')}`
            : `/api/rankings?marketIds=${currentMarketIds.join(',')}`;
          try {
            const rankingsRes = await axios.get(rankingsUrl);
            rankingsData = rankingsRes.data || [];
            console.log('📊 [排名数据] 获取到的排名数据数量:', rankingsData.length);
          } catch (error) {
            console.error('❌ [排名数据] 本地API获取排名失败:', error);
            // 12.4时如果本地API失败，不尝试外部API
            if (useLocalForTest) {
              console.log('⚠️ [排名数据] 12.4本地API失败，返回空数据（不尝试外部API）');
            }
            rankingsData = [];
          }
        } else {
          // 从外部API的feedmarket表获取排名数据
          console.log('📡 [排名数据] 从外部API的feedmarket表获取排名');
          try {
            rankingsData = await getRankings({
              date: selectedDate || getToday(),
              marketIds: currentMarketIds
            });
            console.log('📊 [排名数据] 获取到的排名数据数量:', rankingsData.length);
          } catch (error) {
            console.error('❌ [排名数据] 获取排名失败:', error);
            rankingsData = [];
          }
        }
      } else {
        console.log('⚠️ [排名数据] 跳过获取排名（没有市场数据）');
        rankingsData = [];
      }
      
      console.log('📊 最终市场数据数量:', marketsData?.length || 0);
      console.log('📊 最终反馈数据:', feedbackData);
      console.log('📊 最终排名数据数量（过滤后）:', rankingsData?.length || 0);
      
      // 调试：检查marketsData的内容
      if (marketsData && marketsData.length > 0) {
        console.log('✅ [调试] marketsData有数据，第一条:', JSON.stringify(marketsData[0], null, 2).substring(0, 300));
      } else {
        console.warn('⚠️ [调试] marketsData为空或undefined:', marketsData);
        console.warn('⚠️ [调试] marketsData类型:', typeof marketsData);
        console.warn('⚠️ [调试] marketsData是否为数组:', Array.isArray(marketsData));
      }
      
      setMarkets(marketsData);
      setFeedback(feedbackData);
      console.log('✅ [调试] setMarkets已调用，markets状态应该已更新');
      console.log('📝 设置的反馈数据:', feedbackData);
      console.log('📝 反馈数据键:', Object.keys(feedbackData || {}));
      
      // 将排名数据转换为对象，key为marketId
      // 同时创建一个反向映射，用于匹配不同格式的marketId
      const rankingsMap = {};
      const rankingsByQuestion = {}; // 按问题文本索引，用于匹配
      
      if (rankingsData && Array.isArray(rankingsData)) {
        console.log('📊 [排名数据] 原始数据数量:', rankingsData.length);
        rankingsData.forEach(item => {
          const key = item.marketId || item.market_id;
          rankingsMap[key] = item;
          
          // 同时按问题文本索引（用于匹配外部API的市场）
          if (item.question) {
            rankingsByQuestion[item.question] = item;
          }
          
          if (item.rank) {
            console.log(`  ✅ 市场 ${key}: 排名=${item.rank}, 平均分=${item.averageRating?.toFixed(2)}, 评分人数=${item.ratingCount}, 问题="${item.question}"`);
          }
        });
        console.log('📊 [排名数据] 排名Map包含', Object.keys(rankingsMap).length, '个市场');
        console.log('📊 [排名数据] 排名Map的keys:', Object.keys(rankingsMap).slice(0, 10));
        const rankedMarkets = Object.values(rankingsMap).filter(r => r.rank);
        console.log('📊 [排名数据] 有排名的市场数量:', rankedMarkets.length);
        if (rankedMarkets.length > 0) {
          console.log('📊 [排名数据] 有排名的市场:', rankedMarkets.slice(0, 5).map(r => `${r.marketId}(rank=${r.rank})`).join(', '));
        }
      } else {
        console.log('⚠️ [排名数据] rankingsData不是数组:', rankingsData);
      }
      
      // 将rankingsByQuestion也存储到rankingsMap中，用于匹配
      setRankings({ ...rankingsMap, _byQuestion: rankingsByQuestion });
      
      // 如果用户已提交，从数据库加载已保存的评分和回复数据到临时状态中（用于显示）
      // 注意：只有在用户已提交时才加载已保存的数据，避免覆盖用户正在填写的数据
      if (isSubmitted && marketsData.length > 0) {
        console.log('📥 [loadData] 用户已提交，加载已保存的评分和回复数据到临时状态');
        const savedRatings = {};
        const savedFieldReplies = {};
        
        // 加载已保存的评分（只加载当前用户的）
        const ratingPromises = marketsData.map(async (market) => {
          const marketId = market['Market ID'] || market.marketId || market.id;
          if (marketId) {
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
                  market_id: marketId,
                  user_id: user.id,
                  date: dateStr
                });
                // 从返回的reviews数组中获取第一条评论记录
                if (response?.reviews && response.reviews.length > 0) {
                  rating = response.reviews[0].rating || 0;
                }
              } else {
                // 使用本地API
                const ratingResponse = await axios.get(`/api/ratings/${marketId}/${user.id}?date=${dateStr}`);
                rating = ratingResponse.data.rating || 0;
              }

              if (rating > 0) {
                savedRatings[marketId] = Number(rating);
              }
            } catch (error) {
              // 忽略错误，继续处理下一个市场
            }
          }
        });
        
        // 加载已保存的字段回复（只加载当前用户的）
        const replyPromises = marketsData.map(async (market) => {
          const marketId = market['Market ID'] || market.marketId || market.id;
          if (marketId) {
            try {
              const repliesResponse = await axios.get(`/api/field-replies/${marketId}`);
              const marketReplies = repliesResponse.data || {};
              
              // 只加载当前用户的回复
              const userReplies = {};
              for (const fieldName in marketReplies) {
                const replies = marketReplies[fieldName] || [];
                const userReply = replies.find(r => r.userId === user.id);
                if (userReply) {
                  userReplies[fieldName] = userReply.comment;
                }
              }
              
              if (Object.keys(userReplies).length > 0) {
                savedFieldReplies[marketId] = userReplies;
              }
            } catch (error) {
              // 忽略错误，继续处理下一个市场
            }
          }
        });
        
        // 并行加载所有评分和回复
        await Promise.all([...ratingPromises, ...replyPromises]);
        
        setPendingRatings(savedRatings);
        setPendingFieldReplies(savedFieldReplies);
        console.log('✅ [loadData] 已加载已保存的数据到临时状态');
        console.log('  - 评分数量:', Object.keys(savedRatings).length);
        console.log('  - 回复数量:', Object.keys(savedFieldReplies).length);
      } else if (!isSubmitted) {
        // 如果用户未提交，清空临时状态，让用户重新填写
        console.log('📝 [loadData] 用户未提交，清空临时状态');
        setPendingRatings({});
        setPendingFieldReplies({});
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        alert('未找到指定日期的数据');
      } else {
        alert('加载数据失败: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false)
    }
  }

  // 将反馈数据按market_id分组
  const groupFeedbacksByMarket = (response) => {
    const grouped = {};
    const reviews = response?.reviews || [];
    reviews.forEach(review => {
      const marketId = review.market_id;
      if (!grouped[marketId]) {
        grouped[marketId] = [];
      }
      grouped[marketId].push(review);
    });
    return grouped;
  };

  // 只加载反馈数据（用于轮询）
  const loadFeedback = async () => {
    try {
      // 如果未提交，不加载其他用户的反馈数据
      if (!hasSubmitted) {
        console.log('⏸️ [反馈数据] 用户未提交，不加载其他用户的反馈数据');
        setFeedback({})
        return
      }
      
      // 检查是否是12.4，如果是则强制使用本地存储
      const date = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      const useLocalForTest = date === '2025-12-04';
      
      if (USE_LOCAL_FEEDBACK || useLocalForTest) {
        // 使用本地API
        console.log('🔄 [轮询-反馈] 使用本地API更新反馈数据' + (useLocalForTest ? '（12.4特殊处理）' : ''));
    try {
      const feedbackRes = await axios.get('/api/feedback')
          setFeedback(feedbackRes.data || {})
        } catch (error) {
          console.error('❌ [轮询-反馈] 本地API请求失败:', error);
          // 12.4时如果本地API失败，不尝试外部API
          if (useLocalForTest) {
            console.log('⚠️ [轮询-反馈] 12.4本地API失败，跳过更新（不尝试外部API）');
            return;
          }
        }
      } else {
        // 从外部API的feedmarket表获取反馈数据
        console.log('🔄 [轮询-反馈] 更新反馈数据，日期:', date);
        try {
          const response = await getFeedbacksByDate(date);
          const grouped = groupFeedbacksByMarket(response);
          setFeedback(grouped);
          console.log('✅ [轮询-反馈] 反馈数据已更新');
        } catch (error) {
          console.error('❌ [轮询-反馈] 外部API请求失败:', error);
        }
      }
    } catch (error) {
      console.error('❌ [轮询-反馈] 加载反馈失败:', error)
      // 如果外部API失败，不显示错误（避免频繁弹窗）
      const date = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      const useLocalForTest = date === '2025-12-04';
      if (!USE_LOCAL_FEEDBACK && !useLocalForTest) {
        console.error('错误详情:', error.response?.data || error.message)
      }
    }
  }

  // 加载排名数据
  const loadRankings = async () => {
    try {
      // 如果未提交，不加载排名数据
      if (!hasSubmitted) {
        console.log('⏸️ [排名数据] 用户未提交，不加载排名数据');
        setRankings({})
        return
      }
      
      // 获取当前市场数据中的所有marketId
      const currentMarketIds = markets.map(m => m['Market ID'] || m.marketId || m.id);
      
      if (currentMarketIds.length === 0) {
        console.log('⚠️ [排名数据] 没有市场数据，跳过获取排名');
        return;
      }
      
      // 格式化日期为 YYYY-MM-DD
      const dateStr = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      // 检查是否是12.4，如果是则强制使用本地存储
      const useLocalForTest = dateStr === '2025-12-04';
      
      let rankingsData = [];
      
      // 优先使用本地API（因为用户已提交的数据在本地）
      // 如果本地API没有数据，再尝试外部API
      if (USE_LOCAL_RANKINGS || useLocalForTest || hasSubmitted) {
        // 从本地API获取排名
        const rankingsUrl = dateStr
          ? `/api/rankings?date=${dateStr}&marketIds=${currentMarketIds.join(',')}`
          : `/api/rankings?marketIds=${currentMarketIds.join(',')}`;
        
        console.log('📊 [排名数据] 从本地API获取，URL:', rankingsUrl + (useLocalForTest ? '（12.4特殊处理）' : hasSubmitted ? '（用户已提交，数据在本地）' : ''));
        try {
          const rankingsRes = await axios.get(rankingsUrl);
          rankingsData = rankingsRes.data || [];
          console.log('📊 [排名数据] 本地API返回数据数量:', rankingsData.length);
        } catch (error) {
          console.error('❌ [排名数据] 本地API获取失败:', error);
          rankingsData = [];
          
          // 如果本地API失败且不是12.4，尝试外部API
          if (!useLocalForTest && !USE_LOCAL_RANKINGS) {
            console.log('📊 [排名数据] 本地API失败，尝试外部API');
            try {
              rankingsData = await getRankings({
                date: dateStr,
                marketIds: currentMarketIds
              });
              console.log('📊 [排名数据] 外部API返回数据数量:', rankingsData.length);
            } catch (externalError) {
              if (externalError.response?.status === 404) {
                console.log('📊 [排名数据] 外部API也没有排名数据（404是正常的）');
              } else {
                console.error('❌ [排名数据] 外部API请求失败:', externalError);
              }
              rankingsData = [];
            }
          }
        }
      } else {
        // 先尝试外部API，如果失败再尝试本地API
        console.log('📊 [排名数据] 从外部API的feedmarket表获取排名');
        try {
          rankingsData = await getRankings({
            date: dateStr,
            marketIds: currentMarketIds
          });
          console.log('📊 [排名数据] 外部API返回数据数量:', rankingsData.length);
        } catch (error) {
          // 404是正常的，表示该日期没有排名数据
          if (error.response?.status === 404) {
            console.log('📊 [排名数据] 外部API没有排名数据，尝试本地API');
            // 外部API没有数据，尝试本地API
            try {
              const rankingsUrl = dateStr
                ? `/api/rankings?date=${dateStr}&marketIds=${currentMarketIds.join(',')}`
                : `/api/rankings?marketIds=${currentMarketIds.join(',')}`;
              const rankingsRes = await axios.get(rankingsUrl);
              rankingsData = rankingsRes.data || [];
              console.log('📊 [排名数据] 本地API返回数据数量:', rankingsData.length);
            } catch (localError) {
              console.error('❌ [排名数据] 本地API也获取失败:', localError);
              rankingsData = [];
            }
          } else {
            console.error('❌ [排名数据] 外部API请求失败:', error);
            rankingsData = [];
          }
        }
      }
      
      console.log('📊 [排名数据] 响应数据数量:', rankingsData?.length || 0);
      
      // 将排名数据转换为对象，key为marketId
      const rankingsMap = {};
      const rankingsByQuestion = {}; // 按问题文本索引，用于匹配
      
      if (rankingsData && Array.isArray(rankingsData)) {
        rankingsData.forEach(item => {
          const key = item.marketId || item.market_id;
          rankingsMap[key] = item;
          
          // 同时按问题文本索引（用于匹配外部API的市场）
          if (item.question) {
            rankingsByQuestion[item.question] = item;
          }
        });
      }
      
      // 将rankingsByQuestion也存储到rankingsMap中，用于匹配
      setRankings({ ...rankingsMap, _byQuestion: rankingsByQuestion });
      console.log('📊 [排名数据] 已更新排名Map，包含', Object.keys(rankingsMap).length, '个市场');
    } catch (error) {
      console.error('加载排名失败:', error)
    }
  }

  // 轮询获取最新反馈数据和排名
  useEffect(() => {
    if (loading) {
      console.log('⏸️ [轮询] 初始加载中，跳过轮询');
      return; // 初始加载时不轮询
    }

    console.log('🔄 [轮询] 开始轮询，间隔: 10秒');
    const pollInterval = setInterval(() => {
      console.log('🔄 [轮询] 执行轮询更新');
      loadFeedback()
      loadRankings()
    }, 10000) // 每10秒轮询一次（减少频率）

    return () => {
      console.log('🛑 [轮询] 停止轮询');
      clearInterval(pollInterval);
    }
  }, [loading, selectedDate])

  const handleAddFeedback = async (marketId, comment) => {
    try {
      const dateStr = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      // 检查是否使用外部API（12.4特殊处理除外）
      const useLocalForTest = dateStr === '2025-12-04';
      
      if (USE_EXTERNAL_API && !useLocalForTest) {
        // 使用外部API保存反馈
        console.log('💾 [提交反馈] 保存到外部API');
        console.log('市场ID:', marketId);
        console.log('反馈内容:', comment);
        
        const { createFeedback } = await import('../utils/apiClient');
        const feedbackData = {
          date: dateStr,
          market_id: marketId,
          title_approved: true,
          title_feedback: '',
          description_approved: true,
          description_feedback: '',
          options_approved: true,
          options_feedback: '',
          resolution_rule_approved: true,
          resolution_rule_feedback: '',
          resolution_date_approved: true,
          resolution_date_feedback: '',
          category: 1,
          overall_comment: comment || ''
        };
        
        const response = await createFeedback(feedbackData);
        console.log('✅ [提交反馈] 反馈已保存到外部API:', response);
      } else {
        // 使用本地API保存反馈
        console.log('💾 [提交反馈] 保存到本地API');
        const response = await axios.post('/api/feedback', {
          marketId,
          userId: user.id,
          userName: user.name,
          comment
        });
        console.log('✅ [提交反馈] 反馈已保存:', response.data);
        
        // 更新本地反馈状态
        setFeedback(prev => {
          const newFeedback = { ...prev };
          if (!newFeedback[marketId]) {
            newFeedback[marketId] = [];
          }
          newFeedback[marketId] = [...newFeedback[marketId], response.data.feedback];
          return newFeedback;
        });
      }
      
      // 立即刷新一次反馈数据，确保数据同步
      setTimeout(() => {
        loadFeedback();
      }, 500);
    } catch (error) {
      console.error('添加反馈失败:', error)
      if (error.response) {
        if (error.response.status === 400) {
          alert('提交失败：无效的分类')
        } else if (error.response.status === 422) {
          const errors = error.response.data.detail?.map(e => e.msg).join(', ') || '验证错误'
          alert(`提交失败：${errors}`)
        } else if (error.response.status === 500) {
          alert('服务器错误，请稍后重试')
        } else {
      alert('添加反馈失败，请重试')
        }
      } else {
        alert('网络错误，请检查网络连接')
      }
    }
  }

  const handleUpdateFeedback = async (marketId, feedbackId, comment) => {
    try {
      const response = await axios.put('/api/feedback', {
        marketId,
        feedbackId,
        userId: user.id,
        userName: user.name,
        comment
      })
      
      // 更新本地反馈状态
      setFeedback(prev => {
        const newFeedback = { ...prev }
        if (newFeedback[marketId]) {
          const index = newFeedback[marketId].findIndex(f => f.id === feedbackId)
          if (index !== -1) {
            newFeedback[marketId][index] = response.data.feedback
          }
        }
        return newFeedback
      })
      
      // 立即刷新一次反馈数据
      setTimeout(() => {
        loadFeedback()
      }, 500)
    } catch (error) {
      console.error('修改反馈失败:', error)
      alert(error.response?.data?.error || '修改反馈失败，请重试')
    }
  }

  const handleDeleteFeedback = async (marketId, feedbackId) => {
    if (!window.confirm('确定要删除这条反馈吗？')) {
      return
    }

    try {
      await axios.delete('/api/feedback', {
        data: {
          marketId,
          feedbackId,
          userId: user.id,
          userName: user.name
        }
      })
      
      // 更新本地反馈状态
      setFeedback(prev => {
        const newFeedback = { ...prev }
        if (newFeedback[marketId]) {
          newFeedback[marketId] = newFeedback[marketId].filter(f => f.id !== feedbackId)
        }
        return newFeedback
      })
      
      // 立即刷新一次反馈数据
      setTimeout(() => {
        loadFeedback()
      }, 500)
    } catch (error) {
      console.error('删除反馈失败:', error)
      alert(error.response?.data?.error || '删除反馈失败，请重试')
    }
  }

  // 临时存储评分（不立即保存）
  const handleRate = (marketId, rating) => {
    console.log('⭐ [临时评分] 存储评分到临时状态:', { marketId, rating });
    setPendingRatings(prev => ({
      ...prev,
      [marketId]: rating
    }))
  }

  // 实际保存评分到数据库
  const saveRating = async (marketId, rating) => {
    try {
      const dateStr = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();
      
      console.log('⭐ [保存评分] 提交评分到数据库:', { marketId, userId: user.id, rating, date: dateStr });

      // 检查是否使用外部API（12.4特殊处理除外）
      const useLocalForTest = dateStr === '2025-12-04';

      if (USE_EXTERNAL_API && !useLocalForTest) {
        // 使用外部API保存评论 (yoyo-content /v1/reviews)
        console.log('📡 [保存评分] 使用外部API保存评论');
        await upsertReview({
          market_id: marketId,
          user_id: user.id,
          rating,
          date: dateStr
        });
      } else {
        // 使用本地API保存
        await axios.post('/api/ratings', {
          marketId,
          userId: user.id,
          rating,
          date: dateStr
        });
      }
      
      console.log('✅ [保存评分] 评分成功');
    } catch (error) {
      console.error('保存评分失败:', error)
      throw error
    }
  }

  const handleAddReply = async (marketId, feedbackId, comment) => {
    try {
      console.log('发送添加回复请求:', { marketId, feedbackId, userId: user.id, userName: user.name, comment })
      
      const response = await axios.post('/api/feedback/reply', {
        marketId,
        feedbackId,
        userId: user.id,
        userName: user.name,
        comment
      })
      
      console.log('添加回复成功:', response.data)
      
      // 更新本地反馈状态
      setFeedback(prev => {
        const newFeedback = { ...prev }
        if (newFeedback[marketId]) {
          const index = newFeedback[marketId].findIndex(f => f.id === feedbackId)
          if (index !== -1) {
            if (!newFeedback[marketId][index].replies) {
              newFeedback[marketId][index].replies = []
            }
            newFeedback[marketId][index].replies.push(response.data.reply)
          }
        }
        return newFeedback
      })
      
      // 立即刷新一次反馈数据
      setTimeout(() => {
        loadFeedback()
      }, 500)
    } catch (error) {
      console.error('添加回复失败:', error)
      console.error('错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      })
      alert(error.response?.data?.error || '添加回复失败，请重试')
    }
  }

  const handleDeleteReply = async (marketId, feedbackId, replyId) => {
    if (!window.confirm('确定要删除这条回复吗？')) {
      return
    }

    try {
      await axios.delete('/api/feedback/reply', {
        data: {
          marketId,
          feedbackId,
          replyId,
          userId: user.id,
          userName: user.name
        }
      })
      
      // 更新本地反馈状态
      setFeedback(prev => {
        const newFeedback = { ...prev }
        if (newFeedback[marketId]) {
          const index = newFeedback[marketId].findIndex(f => f.id === feedbackId)
          if (index !== -1 && newFeedback[marketId][index].replies) {
            newFeedback[marketId][index].replies = newFeedback[marketId][index].replies.filter(r => r.id !== replyId)
          }
        }
        return newFeedback
      })
      
      // 立即刷新一次反馈数据
      setTimeout(() => {
        loadFeedback()
      }, 500)
    } catch (error) {
      console.error('删除回复失败:', error)
      alert(error.response?.data?.error || '删除回复失败，请重试')
    }
  }

  // 临时存储字段回复（不立即保存）
  const handleAddFieldReply = useCallback((marketId, fieldName, comment) => {
    console.log('💬 [临时回复] 存储字段回复到临时状态:', { marketId, fieldName, comment });
    setPendingFieldReplies(prev => ({
      ...prev,
      [marketId]: {
        ...(prev[marketId] || {}),
        [fieldName]: comment
      }
    }))
  }, [])

  // 实际保存字段回复到数据库
  const saveFieldReply = async (marketId, fieldName, comment) => {
    try {
      await axios.post('/api/field-replies', {
        marketId,
        fieldName,
        userId: user.id,
        userName: user.name,
        comment
      })
      console.log('✅ [保存回复] 字段回复成功');
    } catch (error) {
      console.error('保存字段回复失败:', error)
      throw error
    }
  }

  // 删除字段回复（从临时状态中删除）
  const handleDeleteFieldReply = useCallback((marketId, fieldName, replyId) => {
    // 如果是临时状态中的回复，直接删除
    setPendingFieldReplies(prev => {
      const newState = { ...prev }
      if (newState[marketId] && newState[marketId][fieldName]) {
        // 临时状态中只存储最新的回复，所以直接删除该字段
        delete newState[marketId][fieldName]
        if (Object.keys(newState[marketId]).length === 0) {
          delete newState[marketId]
        }
      }
      return newState
    })
    
    // 如果是已保存的回复，需要调用API删除
    // 这里暂时不处理已保存的回复删除，因为用户要求的是提交前验证
  }, [])

  // 验证必填项
  // 3星评分时，描述和标题回复变为可选
  const validateRequiredFields = () => {
    const errors = []

    markets.forEach((market, index) => {
      const marketId = market['Market ID'] || market.marketId || market.id
      const cardErrors = []
      const rating = pendingRatings[marketId]

      // 检查评分（始终必填）
      if (!rating || rating === 0) {
        cardErrors.push({ type: 'rating', message: '请为这条预测评分' })
      }

      // 3星评分时，描述和标题回复变为可选
      if (rating !== 3) {
        // 检查描述回复（选项选择）
        const descriptionReply = pendingFieldReplies[marketId]?.['Description']
        if (!descriptionReply || descriptionReply.trim() === '') {
          cardErrors.push({ type: 'description', message: '请选择描述的评价选项' })
        }

        // 检查标题回复（选项选择）
        const questionReply = pendingFieldReplies[marketId]?.['Question']
        if (!questionReply || questionReply.trim() === '') {
          cardErrors.push({ type: 'question', message: '请选择标题的评价选项' })
        }
      }

      if (cardErrors.length > 0) {
        errors.push({ marketId, index, errors: cardErrors })
      }
    })

    return errors
  }

  // 滚动到第一个未完成的卡片
  const scrollToFirstError = (errorIndex) => {
    const cardElements = document.querySelectorAll('.market-card')
    if (cardElements[errorIndex]) {
      cardElements[errorIndex].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      // 添加高亮效果
      cardElements[errorIndex].style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.5)'
      setTimeout(() => {
        cardElements[errorIndex].style.boxShadow = ''
      }, 2000)
    }
  }

  // 提交所有数据
  const handleSubmit = async () => {
    // 如果已经提交过，不允许再次提交
    if (hasSubmitted) {
      alert('您已经提交过数据，无法再次提交')
      return
    }
    
    // 验证必填项
    const validationErrors = validateRequiredFields()
    
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]
      alert(`请完成所有必填项！\n\n第一个未完成项：${firstError.errors[0].message}`)
      scrollToFirstError(firstError.index)
      return
    }

    try {
      const dateStr = selectedDate 
        ? formatDate(selectedDate) 
        : getToday();

      // 保存所有评分
      const ratingPromises = Object.entries(pendingRatings).map(([marketId, rating]) =>
        saveRating(marketId, rating)
      )

      // 保存所有字段回复
      const replyPromises = []
      Object.entries(pendingFieldReplies).forEach(([marketId, fieldReplies]) => {
        Object.entries(fieldReplies).forEach(([fieldName, comment]) => {
          replyPromises.push(saveFieldReply(marketId, fieldName, comment))
        })
      })

      // 并行保存所有数据
      await Promise.all([...ratingPromises, ...replyPromises])

      // 清空临时状态
      setPendingRatings({})
      setPendingFieldReplies({})

      // 标记为已提交
      setHasSubmitted(true)

      // 刷新排名数据和反馈数据（现在可以加载其他用户的数据）
      await loadRankings()
      await loadFeedback()
      
      alert('提交成功！现在可以查看所有排名和回复数据。')
    } catch (error) {
      console.error('提交失败:', error)
      alert('提交失败，请重试')
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

  // 如果显示所有提交数据界面，渲染该界面
  if (showAllSubmissions) {
    return (
      <AllSubmissionsView
        user={user}
        selectedDate={selectedDate}
        onBack={() => setShowAllSubmissions(false)}
      />
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>市场数据反馈系统</h1>
          <div className="header-actions">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
            <button 
              onClick={() => {
                if (!hasSubmitted) {
                  alert('请提交数据后查看排名')
                  return
                }
                setShowRankingModal(true)
              }}
              className="ranking-button"
            >
              📊 实时排名
            </button>
            {hasSubmitted && (
              <button 
                onClick={() => setShowAllSubmissions(true)}
                className="all-submissions-button"
              >
                📋 查看所有提交
              </button>
            )}
            {(() => {
              console.log('🎯 [渲染] 当前hasSubmitted状态:', hasSubmitted, '用户ID:', user?.id);
              return hasSubmitted ? (
                <div className="submitted-status">
                  <span className="submitted-text">✅ 已提交</span>
                  <span className="submitted-hint">（无法修改）</span>
                </div>
              ) : (
                <button 
                  onClick={handleSubmit}
                  className="submit-button"
                >
                  ✅ 提交数据
                </button>
              );
            })()}
            <div className="user-info">
              <img src={user.avatar} alt={user.name} className="user-avatar" />
              <span className="user-name">
                {user.name}
                {user.isAdmin && <span className="admin-label">👑 管理员</span>}
              </span>
              <button onClick={onLogout} className="logout-button">
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="markets-container">
          {(() => {
            console.log('🎨 [渲染] 开始渲染市场列表，markets数量:', markets?.length || 0);
            if (!markets || markets.length === 0) {
              console.warn('⚠️ [渲染] markets为空，不会渲染任何内容');
              return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>暂无市场数据</div>;
            }
            return markets.map((market, index) => {
              const marketId = market['Market ID'] || market.marketId || market.id;
              let marketRanking = rankings[marketId];
              
              // 如果直接匹配失败，尝试通过问题文本匹配（用于外部API的情况）
              if (!marketRanking && rankings._byQuestion && market.Question) {
                marketRanking = rankings._byQuestion[market.Question];
                if (marketRanking) {
                  console.log(`🔄 [市场卡片] ${marketId}: 通过问题文本匹配到排名数据, rank=${marketRanking.rank}`);
                }
              }
              
              // 详细调试日志
              if (!marketRanking) {
                // 检查是否有类似的marketId
                const allKeys = Object.keys(rankings).filter(k => k !== '_byQuestion');
                const similarKeys = allKeys.filter(key => 
                  key.toLowerCase() === marketId?.toLowerCase() || 
                  key.includes(marketId) || 
                  marketId?.includes(key)
                );
                if (similarKeys.length > 0) {
                  console.log(`⚠️ [市场卡片] ${marketId}: 未找到排名数据，但发现相似的keys:`, similarKeys);
                } else {
                  console.log(`❌ [市场卡片] ${marketId}: 未找到排名数据, 问题="${market.Question}"`);
                }
              } else if (marketRanking.rank) {
                console.log(`✅ [市场卡片] ${marketId}: 找到排名数据, rank=${marketRanking.rank}, 平均分=${marketRanking.averageRating?.toFixed(2)}, 评分人数=${marketRanking.ratingCount}`);
              } else {
                console.log(`ℹ️ [市场卡片] ${marketId}: 有排名数据但无rank字段 (ratingCount=${marketRanking.ratingCount})`);
              }
              
              return (
                <MarketCard
                  key={marketId || index}
                  market={market}
                  feedbacks={feedback[marketId] || []}
                  ranking={marketRanking}
                  selectedDate={selectedDate}
                  currentUser={user}
                  onAddFeedback={handleAddFeedback}
                  onUpdateFeedback={handleUpdateFeedback}
                  onDeleteFeedback={handleDeleteFeedback}
                  onRate={handleRate}
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
                  onAddFieldReply={handleAddFieldReply}
                  onDeleteFieldReply={handleDeleteFieldReply}
                  pendingRating={pendingRatings[marketId]}
                  pendingFieldReplies={pendingFieldReplies[marketId] || {}}
                  hasSubmitted={hasSubmitted}
                />
              );
            });
          })()}
        </div>
      </main>

      <RatingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
          selectedDate={selectedDate}
        markets={markets}
        currentUser={user}
        onRate={handleRate}
          hasSubmitted={hasSubmitted}
      />
    </div>
  )
}

export default Dashboard

