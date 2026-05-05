# 问卷自动化 MVP

本项目是本地 Web 工具。第一版只处理公开、无需登录、无需验证码、无需复杂人机验证的网页问卷。

## 运行

```powershell
npm install
npx playwright install chromium
npm run server
npm run dev
```

打开 `http://127.0.0.1:5173`。

在控制台填写问卷链接、本地资料和模型配置后，点击“分析并填写任务”。后端会打开一个受控 Chromium 浏览器窗口，自动分析并填写页面，完成后停在提交前等待人工检查。

## 边界

- 个人资料和模型配置保存在本机 `.data/`。
- 用户自行配置 OpenAI-compatible `Base URL`、`API Key` 和模型名。`Base URL` 可以填 `https://example.com/v1`，也可以填完整的 `https://example.com/v1/chat/completions`。
- 系统只自动填写页面，不自动提交。
- 登录页、验证码、人机验证和敏感问题会停止或标记为人工处理。

## 验证

```powershell
npm run test
npm run build
```
