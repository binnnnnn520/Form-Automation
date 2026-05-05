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

在控制台填写问卷链接、本地资料和模型配置后，点击“分析并填写任务”。后端会打开一个受控 Microsoft Edge 浏览器窗口，自动分析并填写页面，完成后停在提交前等待人工检查。

如果问卷星拦截受控 Edge，普通 Edge 可以打开但不会自动填写。此时使用控制台里的“真实页面填充助手”：

1. 先点击“保存资料和模型配置”。
2. 把“真实页面填充助手”拖到 Edge 收藏栏。
3. 在普通 Edge 打开问卷页面。
4. 在问卷页面点击收藏栏里的“真实页面填充助手”，它会调用本地模型填写当前页面。
5. 人工检查后手动提交。

如果 Edge 不能拖拽到收藏栏，点击“复制助手代码”，然后在 Edge 里新建一个收藏，把收藏的 URL 地址改成复制出来的 `javascript:` 代码。之后打开问卷页面，点击这个收藏即可。

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
