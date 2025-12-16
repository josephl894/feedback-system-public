#!/bin/bash
# 启动脚本

# 设置生产环境
export NODE_ENV=production

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "⚠️  dist目录不存在，正在构建前端..."
    npm run build
fi

# 启动服务器
echo "🚀 启动服务器..."
node server.js
