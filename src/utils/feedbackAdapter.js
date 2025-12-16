/**
 * 反馈数据适配器
 * 用于在外部API格式和本地系统格式之间转换
 */

/**
 * 将外部API的反馈格式转换为本地系统格式
 * @param {Object} apiReview - API返回的反馈对象
 * @returns {Object} 本地系统格式的反馈对象
 */
export const adaptFeedbackFromAPI = (apiReview) => {
  // 构建反馈内容，包含所有部分的反馈信息
  let commentParts = [];
  
  if (apiReview.title_feedback) {
    commentParts.push(`标题反馈: ${apiReview.title_feedback} (${apiReview.title_approved ? '通过' : '不通过'})`);
  }
  if (apiReview.description_feedback) {
    commentParts.push(`描述反馈: ${apiReview.description_feedback} (${apiReview.description_approved ? '通过' : '不通过'})`);
  }
  if (apiReview.options_feedback) {
    commentParts.push(`选项反馈: ${apiReview.options_feedback} (${apiReview.options_approved ? '通过' : '不通过'})`);
  }
  if (apiReview.resolution_rule_feedback) {
    commentParts.push(`解决规则反馈: ${apiReview.resolution_rule_feedback} (${apiReview.resolution_rule_approved ? '通过' : '不通过'})`);
  }
  if (apiReview.resolution_date_feedback) {
    commentParts.push(`解决日期反馈: ${apiReview.resolution_date_feedback} (${apiReview.resolution_date_approved ? '通过' : '不通过'})`);
  }
  if (apiReview.overall_comment) {
    commentParts.push(`总体评论: ${apiReview.overall_comment}`);
  }
  
  // 如果没有具体反馈，使用总体评论或默认文本
  const comment = commentParts.length > 0 
    ? commentParts.join('\n')
    : (apiReview.overall_comment || '已提交反馈');
  
  return {
    id: apiReview.review_id,
    marketId: apiReview.market_id,
    userId: apiReview.user_id || apiReview.userId || 'api-user', // 尝试从API获取userId
    userName: apiReview.user_name || apiReview.userName || 'API用户', // 尝试从API获取userName
    comment: comment,
    timestamp: apiReview.created_at || new Date().toISOString(),
    replies: [], // API可能不支持回复功能
    // 标记这是从外部API获取的数据
    fromExternalAPI: true,
    // 保留原始数据以便后续使用
    _raw: apiReview
  };
};

/**
 * 将本地系统格式转换为外部API格式
 * @param {Object} simpleFeedback - 本地系统的简单反馈对象
 * @param {string} marketId - 市场ID
 * @param {string} date - 日期 (YYYY-MM-DD格式)
 * @returns {Object} API格式的反馈对象
 */
export const adaptFeedbackToAPI = (simpleFeedback, marketId, date) => {
  return {
    date: date || new Date().toISOString().split('T')[0],
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
    overall_comment: simpleFeedback.comment || simpleFeedback.overall_comment || ''
  };
};

/**
 * 将API返回的反馈列表转换为按marketId分组的格式
 * @param {Object} apiResponse - API响应对象 {date, total_reviews, reviews: [...]}
 * @returns {Object} 按marketId分组的反馈对象
 */
export const groupFeedbacksByMarket = (apiResponse) => {
  const grouped = {};
  
  if (!apiResponse || !apiResponse.reviews || !Array.isArray(apiResponse.reviews)) {
    return grouped;
  }
  
  apiResponse.reviews.forEach(review => {
    const marketId = review.market_id;
    if (!grouped[marketId]) {
      grouped[marketId] = [];
    }
    // 转换为本地格式
    grouped[marketId].push(adaptFeedbackFromAPI(review));
  });
  
  return grouped;
};

