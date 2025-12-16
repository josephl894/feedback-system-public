# 部署说明

## 安装依赖

```bash
npm install
```

## 构建前端

```bash
npm run build
```

## 启动服务器

```bash
npm run server
```

或者使用PM2：

```bash
npm install -g pm2
pm2 start server.js --name market-feedback
```

## 环境变量

如果需要，可以创建 .env 文件配置环境变量。

## 数据文件

数据文件已包含在部署包中：
- ratings.json - 评分数据
- feedback.json - 反馈数据
- fieldReplies.json - 字段回复数据
- users.json - 用户数据

## 端口

默认端口：3001

可以在 server.js 中修改 PORT 变量。
