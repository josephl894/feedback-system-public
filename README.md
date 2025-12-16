# 市场数据反馈系统 - 部署包

## 📦 包含文件

- `src/` - 前端源代码
- `server.js` - 后端服务器
- `package.json` - 依赖配置
- `vite.config.js` - 构建配置
- `index.html` - 入口HTML
- 数据文件（ratings.json, feedback.json, fieldReplies.json, users.json）

## 🚀 快速部署

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 构建前端

\`\`\`bash
npm run build
\`\`\`

### 3. 启动服务器

\`\`\`bash
NODE_ENV=production npm start
\`\`\`

或使用启动脚本：

**Linux/Mac:**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

**Windows:**
\`\`\`cmd
start.bat
\`\`\`

## 📋 详细说明

请查看 `DEPLOY.md` 文件获取完整的部署说明。

## ⚙️ 配置

- 默认端口：3001
- 生产环境：设置 `NODE_ENV=production`
- 数据文件：确保有写入权限

## 🔒 安全

- 注册需要邀请码：`yoyomarket`
- 登录失败5次后锁定30分钟
- 密码必须包含字母和数字

