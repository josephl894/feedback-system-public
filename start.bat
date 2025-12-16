@echo off
REM Windows启动脚本

REM 设置生产环境
set NODE_ENV=production

REM 检查是否已构建
if not exist "dist" (
    echo ⚠️  dist目录不存在，正在构建前端...
    call npm run build
)

REM 启动服务器
echo 🚀 启动服务器...
node server.js
