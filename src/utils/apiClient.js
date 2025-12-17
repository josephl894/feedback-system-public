/**
 * 外部API客户端封装
 * 用于调用 pipeline-api-production.up.railway.app API
 */

import axios from 'axios';

// 使用Vite代理路径，避免CORS问题
// 开发环境：通过 /v1 代理访问外部API
// 生产环境：可以直接使用完整URL或配置代理
const API_BASE_URL = import.meta.env.DEV 
  ? '' // 开发环境使用相对路径，通过Vite代理
  : 'https://pipeline-api-production.up.railway.app';
const API_PREFIX = '/v1'; // 实际API使用v1版本前缀

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('api_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和Token刷新
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token过期，尝试刷新或重新登录
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshUrl = import.meta.env.DEV 
            ? '/v1/auth/refresh' 
            : `${API_BASE_URL}/v1/auth/refresh`;
          const response = await axios.post(refreshUrl, {
            refreshToken,
          });
          const { token } = response.data;
          localStorage.setItem('api_token', token);
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(error.config);
        } catch (refreshError) {
          // 刷新失败，清除Token并跳转登录
          localStorage.removeItem('api_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==================== 用户认证相关 ====================
// 注意：实际API端点需要根据Swagger文档确认

/**
 * 用户注册（如果API支持）
 * @param {Object} userData - 用户数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.password - 密码
 * @param {string} userData.email - 邮箱（可选）
 */
export const register = async (userData) => {
  const response = await apiClient.post(`${API_PREFIX}/auth/register`, userData);
  return response.data;
};

/**
 * 用户登录（如果API支持）
 * @param {Object} credentials - 登录凭证
 * @param {string} credentials.username - 用户名
 * @param {string} credentials.password - 密码
 */
export const login = async (credentials) => {
  const response = await apiClient.post(`${API_PREFIX}/auth/login`, credentials);
  const { token, refreshToken, user } = response.data;
  
  // 保存Token
  if (token) {
    localStorage.setItem('api_token', token);
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
  
  return { user, token };
};

/**
 * 用户登出（如果API支持）
 */
export const logout = async () => {
  try {
    await apiClient.get(`${API_PREFIX}/auth/logout`);
  } finally {
    localStorage.removeItem('api_token');
    localStorage.removeItem('refresh_token');
  }
};

/**
 * 获取当前用户信息（如果API支持）
 */
export const getCurrentUser = async () => {
  const response = await apiClient.get(`${API_PREFIX}/auth/user`);
  return response.data;
};

// ==================== 市场数据相关 ====================
// 注意：实际API端点需要根据Swagger文档确认

/**
 * 从 daily-markets API 获取每日市场数据
 * 根据数据库结构，每日市场数据存储在 dailymarket 表中
 * @param {Object} params - 查询参数
 * @param {string} params.date - 日期筛选 (YYYY-MM-DD格式，必需)
 * @returns {Promise<Array>} 市场数据数组
 */
export const getMarkets = async (params = {}) => {
  const { date } = params;
  
  if (!date) {
    console.error('❌ [getMarkets] 缺少date参数');
    return [];
  }
  
  // 从 /v1/daily-markets 获取每日市场数据（使用连字符，不是下划线）
  const url = `${API_PREFIX}/daily-markets`;
  console.log('📡 [getMarkets] 从 daily-markets API 获取市场数据，URL:', url);
  console.log('📡 [getMarkets] 日期:', date);
  
  try {
    // 添加日期查询参数
    const response = await apiClient.get(url, {
      params: { date }
    });
    console.log('✅ [getMarkets] daily-markets API 响应:', response.data);
    
    // 返回市场数据数组
    const marketsData = response.data?.markets || response.data || [];
    
    console.log('✅ [getMarkets] 获取到的市场数据数量:', marketsData?.length || 0);
    return Array.isArray(marketsData) ? marketsData : [];
  } catch (error) {
    // 处理404错误（该日期没有数据）
    if (error.response?.status === 404) {
      console.log(`ℹ️ [getMarkets] 日期 ${date} 没有市场数据（404是正常的）`);
      return [];
    }
    
    console.error('❌ [getMarkets] 请求失败:', error);
    throw error;
  }
};

/**
 * 获取特定市场数据
 * @param {string} id - 市场ID
 */
export const getMarketById = async (id) => {
  const response = await apiClient.get(`${API_PREFIX}/markets/${id}`);
  return response.data;
};

/**
 * 创建新市场数据（管理员）
 * @param {Object} marketData - 市场数据
 */
export const createMarket = async (marketData) => {
  const response = await apiClient.post(`${API_PREFIX}/markets`, marketData);
  return response.data;
};

/**
 * 更新市场数据（管理员）
 * @param {string} id - 市场ID
 * @param {Object} marketData - 更新的市场数据
 */
export const updateMarket = async (id, marketData) => {
  const response = await apiClient.put(`${API_PREFIX}/markets/${id}`, marketData);
  return response.data;
};

/**
 * 删除市场数据（管理员）
 * @param {string} id - 市场ID
 */
export const deleteMarket = async (id) => {
  const response = await apiClient.delete(`${API_PREFIX}/markets/${id}`);
  return response.data;
};

// ==================== 反馈相关 ====================

/**
 * 按日期获取反馈数据（从 feedmarket 表获取）
 * @param {string} date - 日期，格式为 YYYY-MM-DD
 * @returns {Promise<Object>} FeedbackListResponse
 * @returns {string} returns.date - 日期
 * @returns {number} returns.total_reviews - 总反馈数
 * @returns {Array} returns.reviews - 反馈列表
 */
export const getFeedbacksByDate = async (date) => {
  // 从 feedmarket 表获取反馈数据
  // 可能使用 /v1/feedback/date/{date} 或 /v1/feedmarket 端点
  const url = `${API_PREFIX}/feedback/date/${date}`;
  console.log('📡 [getFeedbacksByDate] 从 feedmarket 表获取反馈数据，URL:', url);
  console.log('📡 [getFeedbacksByDate] 日期:', date);
  
  try {
    const response = await apiClient.get(url);
    
    console.log('📥 [getFeedbacksByDate] API响应状态:', response.status);
    
    // 如果返回404，这是正常的（该日期没有数据）
    if (response.status === 404 || response.data?.detail === 'Not Found') {
      console.log(`ℹ️ [getFeedbacksByDate] 日期 ${date} 没有反馈数据（这是正常的）`);
      return {
        date: date,
        total_reviews: 0,
        reviews: []
      };
    }
    
    console.log('✅ [getFeedbacksByDate] 成功获取反馈数据，数量:', response.data?.total_reviews || 0);
    return response.data;
  } catch (error) {
    // 处理404错误 - 这是正常的，不是错误
    if (error.response?.status === 404) {
      console.log(`ℹ️ [getFeedbacksByDate] 日期 ${date} 没有反馈数据（404是正常的，表示该日期没有数据）`);
      return {
        date: date,
        total_reviews: 0,
        reviews: []
      };
    }
    
    // 其他错误才显示为错误
    console.error('❌ [getFeedbacksByDate] API请求失败:', error.message);
    console.error('错误详情:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    throw error;
  }
};

/**
 * 提交新反馈
 * @param {Object} feedbackData - 反馈数据
 * @param {string} feedbackData.date - 日期 (YYYY-MM-DD格式)
 * @param {string} feedbackData.market_id - 市场ID
 * @param {boolean} feedbackData.title_approved - 标题是否批准
 * @param {string} feedbackData.title_feedback - 标题反馈内容
 * @param {boolean} feedbackData.description_approved - 描述是否批准
 * @param {string} feedbackData.description_feedback - 描述反馈内容
 * @param {boolean} feedbackData.options_approved - 选项是否批准
 * @param {string} feedbackData.options_feedback - 选项反馈内容
 * @param {boolean} feedbackData.resolution_rule_approved - 解决规则是否批准
 * @param {string} feedbackData.resolution_rule_feedback - 解决规则反馈内容
 * @param {boolean} feedbackData.resolution_date_approved - 解决日期是否批准
 * @param {string} feedbackData.resolution_date_feedback - 解决日期反馈内容
 * @param {number} feedbackData.category - 分类ID (integer)
 * @param {string} feedbackData.overall_comment - 总体评论
 * @returns {Promise<Object>} {review_id: string}
 */
export const createFeedback = async (feedbackData) => {
  const response = await apiClient.post(`${API_PREFIX}/feedback`, feedbackData);
  return response.data;
};

/**
 * 创建简化的反馈（适配器方法，将简单反馈转换为API格式）
 * @param {Object} simpleFeedback - 简化反馈数据
 * @param {string} simpleFeedback.market_id - 市场ID
 * @param {string} simpleFeedback.date - 日期 (YYYY-MM-DD格式)
 * @param {string} simpleFeedback.overall_comment - 总体评论（作为主要反馈）
 * @param {number} simpleFeedback.category - 分类ID (可选，默认为1)
 * @param {Object} simpleFeedback.approvals - 批准状态对象（可选）
 * @returns {Promise<Object>} {review_id: string}
 */
export const createSimpleFeedback = async (simpleFeedback) => {
  const {
    market_id,
    date,
    overall_comment,
    category = 1,
    approvals = {}
  } = simpleFeedback;

  // 构建完整的反馈数据
  const fullFeedbackData = {
    date,
    market_id,
    title_approved: approvals.title !== false,
    title_feedback: approvals.title_feedback || '',
    description_approved: approvals.description !== false,
    description_feedback: approvals.description_feedback || '',
    options_approved: approvals.options !== false,
    options_feedback: approvals.options_feedback || '',
    resolution_rule_approved: approvals.resolution_rule !== false,
    resolution_rule_feedback: approvals.resolution_rule_feedback || '',
    resolution_date_approved: approvals.resolution_date !== false,
    resolution_date_feedback: approvals.resolution_date_feedback || '',
    category,
    overall_comment: overall_comment || ''
  };

  return createFeedback(fullFeedbackData);
};

// ==================== 统一评论/评分相关 (market_reviews) ====================

/**
 * 获取评论列表
 * @param {Object} params - 查询参数
 * @param {string} params.market_id - 市场ID筛选
 * @param {string} params.user_id - 用户ID筛选
 * @param {string} params.date - 日期筛选
 * @returns {Promise<Object>} { reviews: [], total: number }
 */
export const getReviews = async (params = {}) => {
  const response = await apiClient.get(`${API_PREFIX}/reviews`, { params });
  return response.data;
};

/**
 * 获取特定用户对特定市场的评论
 * @param {string} marketId - 市场ID
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 评论数据
 */
export const getReview = async (marketId, userId) => {
  const response = await apiClient.get(`${API_PREFIX}/reviews/${marketId}/${userId}`);
  return response.data;
};

/**
 * 创建或更新评论（upsert）
 * @param {Object} reviewData - 评论数据
 * @param {string} reviewData.market_id - 市场ID
 * @param {string} reviewData.user_id - 用户ID
 * @param {number} reviewData.rating - 评分 (1-3)
 * @param {string} reviewData.date - 日期 (YYYY-MM-DD)
 * @param {string} reviewData.question_feedback - 问题反馈（可选）
 * @param {string} reviewData.description_feedback - 描述反馈（可选）
 * @param {string} reviewData.overall_comment - 总体评论（可选）
 * @returns {Promise<Object>} 创建/更新的评论
 */
export const upsertReview = async (reviewData) => {
  const response = await apiClient.post(`${API_PREFIX}/reviews`, reviewData);
  return response.data;
};

/**
 * 删除评论
 * @param {string} marketId - 市场ID
 * @param {string} userId - 用户ID
 */
export const deleteReview = async (marketId, userId) => {
  const response = await apiClient.delete(`${API_PREFIX}/reviews/${marketId}/${userId}`);
  return response.data;
};

/**
 * 获取排名数据（基于market_reviews表聚合）
 * @param {Object} params - 查询参数
 * @param {string} params.date - 日期筛选 (YYYY-MM-DD)
 * @param {Array<string>} params.marketIds - 市场ID列表（可选，用于过滤）
 * @returns {Promise<Object>} { rankings: [], total: number }
 */
export const getRankings = async (params = {}) => {
  const { date, marketIds } = params;

  console.log('📡 [getRankings] 从 market_reviews 表获取排名数据');
  console.log('📡 [getRankings] 日期:', date);
  console.log('📡 [getRankings] 市场ID列表:', marketIds);

  try {
    // 构建查询参数
    const queryParams = {};
    if (date) queryParams.date = date;
    if (marketIds && Array.isArray(marketIds) && marketIds.length > 0) {
      queryParams.market_ids = marketIds.join(',');
    }

    const response = await apiClient.get(`${API_PREFIX}/rankings`, { params: queryParams });

    console.log('✅ [getRankings] 成功获取排名数据');
    // API returns { rankings: [], total: number }
    return response.data?.rankings || [];
  } catch (error) {
    // 处理404错误（该日期没有数据）
    if (error.response?.status === 404) {
      console.log(`ℹ️ [getRankings] 日期 ${date} 没有排名数据（404是正常的）`);
      return [];
    }

    console.error('❌ [getRankings] 请求失败:', error);
    throw error;
  }
};

// ==================== 兼容旧API的别名 ====================
// 保持向后兼容，旧代码仍可使用这些函数名

/**
 * @deprecated 使用 upsertReview 代替
 */
export const createRating = async (ratingData) => {
  return upsertReview(ratingData);
};

/**
 * @deprecated 使用 getReviews 代替
 */
export const getRatings = async (params = {}) => {
  const response = await getReviews(params);
  // 转换响应格式以保持兼容性
  return {
    ratings: response.reviews || [],
    total: response.total || 0
  };
};

// ==================== 管理员功能 ====================

/**
 * 获取所有用户（管理员）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 */
export const getAllUsers = async (params = {}) => {
  const response = await apiClient.get(`${API_PREFIX}/admin/users`, { params });
  return response.data;
};

/**
 * 更新用户信息（管理员）
 * @param {string} id - 用户ID
 * @param {Object} userData - 更新的用户数据
 */
export const updateUser = async (id, userData) => {
  const response = await apiClient.put(`${API_PREFIX}/admin/users/${id}`, userData);
  return response.data;
};

/**
 * 删除用户（管理员）
 * @param {string} id - 用户ID
 */
export const deleteUser = async (id) => {
  const response = await apiClient.delete(`${API_PREFIX}/admin/users/${id}`);
  return response.data;
};

// 导出默认实例（用于自定义请求）
export default apiClient;

