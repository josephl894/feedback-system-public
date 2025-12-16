# GitHub 上传指南

## 📋 完整步骤

### 第一步：在 GitHub 上创建新仓库

1. **登录 GitHub**
   - 访问 https://github.com
   - 登录你的账号

2. **创建新仓库**
   - 点击右上角的 **"+"** 按钮
   - 选择 **"New repository"**

3. **填写仓库信息**
   - **Repository name**: `market-feedback-deploy`（或你喜欢的名字）
   - **Description**: `市场数据反馈系统 - 部署包`（可选）
   - **Visibility**: 
     - ✅ **Public** - 公开（任何人都能看到）
     - ✅ **Private** - 私有（只有你能看到，需要付费账号）
   - ⚠️ **重要**：**不要**勾选以下选项：
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   - 点击 **"Create repository"**

4. **复制仓库地址**
   - 创建成功后，GitHub 会显示仓库地址
   - 复制 HTTPS 地址，例如：
     ```
     https://github.com/你的用户名/market-feedback-deploy.git
     ```
   - 或者 SSH 地址（如果你配置了 SSH key）：
     ```
     git@github.com:你的用户名/market-feedback-deploy.git
     ```

### 第二步：在本地提交代码

在 `部署包` 目录下执行：

```bash
# 1. 创建初始提交（如果还没有提交）
git commit -m "初始提交：市场数据反馈系统部署包"

# 2. 查看提交状态
git log --oneline
```

### 第三步：连接到 GitHub 并推送

```bash
# 1. 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/market-feedback-deploy.git

# 2. 重命名分支为 main（GitHub 默认使用 main）
git branch -M main

# 3. 推送到 GitHub
git push -u origin main
```

### 第四步：验证上传

1. **刷新 GitHub 页面**
   - 你应该能看到所有文件

2. **检查文件列表**
   - ✅ src/ 目录
   - ✅ server.js
   - ✅ package.json
   - ✅ README.md
   - ✅ 其他所有文件

## 🔐 身份验证

### 如果推送时要求输入用户名和密码：

**方法1：使用 Personal Access Token（推荐）**

1. 生成 Token：
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 复制生成的 token

2. 推送时：
   - Username: 你的 GitHub 用户名
   - Password: 粘贴刚才复制的 token（不是密码）

**方法2：使用 SSH（推荐用于长期使用）**

1. 生成 SSH key：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. 添加到 GitHub：
   - 复制 `~/.ssh/id_ed25519.pub` 内容
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 粘贴并保存

3. 使用 SSH 地址：
   ```bash
   git remote set-url origin git@github.com:你的用户名/market-feedback-deploy.git
   git push -u origin main
   ```

## 📝 完整命令示例

假设你的 GitHub 用户名是 `zhangsan`，仓库名是 `market-feedback-deploy`：

```bash
# 进入部署包目录
cd 部署包

# 检查状态
git status

# 如果有未提交的文件，先提交
git add .
git commit -m "初始提交：市场数据反馈系统部署包"

# 添加远程仓库
git remote add origin https://github.com/zhangsan/market-feedback-deploy.git

# 重命名分支
git branch -M main

# 推送到 GitHub
git push -u origin main
```

## ✅ 成功标志

推送成功后，你会看到类似信息：

```
Enumerating objects: 44, done.
Counting objects: 100% (44/44), done.
Delta compression using up to 8 threads
Compressing objects: 100% (42/42), done.
Writing objects: 100% (44/44), done.
To https://github.com/你的用户名/market-feedback-deploy.git
 * [new branch]      main -> main
Branch 'main' set up to track 'origin/main'.
```

## 🔄 后续更新

如果以后需要更新代码：

```bash
# 修改文件后
git add .
git commit -m "更新说明"
git push
```

## 📤 分享给同事

将仓库地址发送给同事：

```
https://github.com/你的用户名/market-feedback-deploy
```

同事可以克隆：

```bash
git clone https://github.com/你的用户名/market-feedback-deploy.git
cd market-feedback-deploy
npm install
npm run build
NODE_ENV=production npm start
```

## ❓ 常见问题

### Q: 提示 "remote origin already exists"
**A:** 说明已经添加过远程仓库，可以：
```bash
# 查看现有远程仓库
git remote -v

# 如果需要更换，先删除再添加
git remote remove origin
git remote add origin https://github.com/你的用户名/新仓库名.git
```

### Q: 推送失败，提示权限错误
**A:** 检查：
1. 仓库地址是否正确
2. 是否有仓库的写入权限
3. 是否使用了正确的身份验证方式

### Q: 想使用私有仓库但没有付费账号
**A:** GitHub 现在免费账号也支持私有仓库，直接选择 Private 即可。

