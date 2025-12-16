# Git 仓库部署说明

## 📦 当前状态

✅ Git 仓库已初始化
✅ 所有文件已添加到暂存区
✅ .gitignore 已配置（排除 node_modules、dist 等）

## 🚀 提交和推送步骤

### 1. 创建初始提交

```bash
cd 部署包
git commit -m "初始提交：市场数据反馈系统部署包"
```

### 2. 创建远程仓库（选择一种方式）

#### 方式A：GitHub
1. 访问 https://github.com/new
2. 创建新仓库（例如：`market-feedback-deploy`）
3. **不要**初始化 README、.gitignore 或 license（我们已经有了）

#### 方式B：GitLab
1. 访问你的 GitLab 实例
2. 创建新项目
3. 选择"空白项目"

#### 方式C：Gitee（码云）
1. 访问 https://gitee.com/projects/new
2. 创建新仓库

### 3. 添加远程仓库并推送

```bash
# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/market-feedback-deploy.git

# 或者使用 SSH
git remote add origin git@github.com:你的用户名/market-feedback-deploy.git

# 推送代码
git branch -M main
git push -u origin main
```

### 4. 分享给同事

将仓库地址发送给同事，他们可以：

```bash
# 克隆仓库
git clone https://github.com/你的用户名/market-feedback-deploy.git

# 进入目录
cd market-feedback-deploy

# 安装依赖
npm install

# 构建前端
npm run build

# 启动服务器
NODE_ENV=production npm start
```

## 📋 已包含的文件

- ✅ 所有源代码（src/）
- ✅ 配置文件（package.json, vite.config.js）
- ✅ 服务器文件（server.js）
- ✅ 数据文件（*.json）
- ✅ 启动脚本（start.sh, start.bat）
- ✅ 文档（README.md, DEPLOY.md）

## ❌ 已排除的文件（.gitignore）

- node_modules/ - 依赖包（需要运行 npm install）
- dist/ - 构建输出（需要运行 npm run build）
- .env - 环境变量
- *.log - 日志文件
- .DS_Store, Thumbs.db - 系统文件

## 🔄 后续更新

如果需要更新代码：

```bash
# 修改文件后
git add .
git commit -m "更新说明"
git push
```

同事可以更新：

```bash
git pull
npm install  # 如果有新的依赖
npm run build
```

## ⚠️ 注意事项

1. **不要提交敏感信息**：确保 .env 文件在 .gitignore 中
2. **数据文件**：users.json 等数据文件已包含，但生产环境建议使用数据库
3. **端口配置**：默认端口 3001，可在 server.js 中修改

