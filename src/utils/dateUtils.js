/**
 * 日期处理工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string} date - 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date) => {
  if (!date) {
    date = new Date();
  }
  
  if (typeof date === 'string') {
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // 如果是其他格式，尝试解析
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD格式的今天日期
 */
export const getToday = () => {
  return formatDate(new Date());
};

/**
 * 从日期字符串获取Date对象
 * @param {string} dateStr - YYYY-MM-DD格式的日期字符串
 * @returns {Date} Date对象
 */
export const parseDate = (dateStr) => {
  if (!dateStr) {
    return new Date();
  }
  // 添加时间部分以确保正确解析
  return new Date(dateStr + 'T00:00:00');
};

/**
 * 验证日期格式是否为 YYYY-MM-DD
 * @param {string} dateStr - 日期字符串
 * @returns {boolean} 是否为有效格式
 */
export const isValidDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * 获取日期的前一天
 * @param {string} dateStr - YYYY-MM-DD格式的日期字符串
 * @returns {string} 前一天的日期字符串
 */
export const getPreviousDay = (dateStr) => {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
};

/**
 * 获取日期的后一天
 * @param {string} dateStr - YYYY-MM-DD格式的日期字符串
 * @returns {string} 后一天的日期字符串
 */
export const getNextDay = (dateStr) => {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + 1);
  return formatDate(date);
};

/**
 * 比较两个日期
 * @param {string} date1 - 第一个日期 (YYYY-MM-DD)
 * @param {string} date2 - 第二个日期 (YYYY-MM-DD)
 * @returns {number} -1: date1 < date2, 0: date1 === date2, 1: date1 > date2
 */
export const compareDates = (date1, date2) => {
  const d1 = parseDate(date1).getTime();
  const d2 = parseDate(date2).getTime();
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

