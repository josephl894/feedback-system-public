/**
 * API配置
 * 控制使用本地API还是外部API
 */

// 是否使用外部API获取市场数据（可以通过环境变量或localStorage控制）
// 默认使用外部API获取市场数据
const getUseExternalApi = () => {
  const stored = localStorage.getItem('use_external_api');
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  // 默认使用外部API获取市场数据
  return true;
};

export const USE_EXTERNAL_API = getUseExternalApi();

// 反馈和排名数据从外部API的feedmarket表获取
// 可以通过环境变量或localStorage控制
const getUseLocalFeedback = () => {
  const stored = localStorage.getItem('use_local_feedback');
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  // 默认使用外部API的feedmarket表
  return false;
};

const getUseLocalRankings = () => {
  const stored = localStorage.getItem('use_local_rankings');
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  // 默认使用外部API的feedmarket表
  return false;
};

export const USE_LOCAL_FEEDBACK = getUseLocalFeedback();
export const USE_LOCAL_RANKINGS = getUseLocalRankings();

// 在控制台显示当前使用的API模式
if (import.meta.env.DEV) {
  console.log('🔧 API配置:');
  console.log('  - 市场数据:', USE_EXTERNAL_API ? '外部API' : '本地API');
  console.log('  - 反馈数据:', USE_LOCAL_FEEDBACK ? '本地API' : '外部API');
  console.log('  - 排名数据:', USE_LOCAL_RANKINGS ? '本地API' : '外部API');
  console.log('🔧 外部API地址: https://pipeline-api-production.up.railway.app');
}

// 外部API基础URL
export const EXTERNAL_API_BASE = 'https://pipeline-api-production.up.railway.app';

// 本地API基础URL - auto-detect for Vercel deployment
const getLocalApiBase = () => {
  // In production (Vercel), use relative paths
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '';  // Use relative paths on Vercel
  }
  return 'http://localhost:3001';
};
export const LOCAL_API_BASE = getLocalApiBase();

// API版本前缀
export const API_VERSION = '/v1';

/**
 * 切换API模式
 * @param {boolean} useExternal - 是否使用外部API
 */
export const setApiMode = (useExternal) => {
  localStorage.setItem('use_external_api', useExternal.toString());
  window.location.reload(); // 重新加载页面以应用新配置
};

/**
 * 获取当前API模式
 * @returns {boolean} 是否使用外部API
 */
export const getApiMode = () => {
  return USE_EXTERNAL_API;
};

