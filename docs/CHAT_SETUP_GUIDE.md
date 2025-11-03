# 聊天功能使用指南

## 🚀 快速开始

### 1️⃣ 配置 API Key

在使用聊天功能之前，您需要配置至少一个 AI 提供商的 API Key。

#### 步骤：

1. **打开设置页面**
   - 点击聊天界面左上角的菜单按钮
   - 选择"设置"

2. **选择 AI 提供商**
   - 在设置页面中找到"AI 提供商"选项
   - 点击您想要使用的提供商（OpenAI、Anthropic、Google Gemini 等）

3. **输入 API Key**
   - 在提供商配置页面中，切换到"API Key"标签
   - 输入您的 API Key
   - 点击"保存"按钮

4. **设置为默认提供商**（可选）
   - 返回设置主页
   - 找到"默认模型"选项
   - 选择您刚才配置的提供商和模型

### 2️⃣ 开始聊天

配置完成后，您就可以开始聊天了！

1. 在聊天输入框中输入您的消息
2. 点击发送按钮（蓝色箭头图标）
3. AI 将实时流式返回响应

## 🎯 支持的 AI 提供商

AetherLink 支持以下 AI 提供商：

| 提供商 | 推荐模型 | 获取 API Key |
|--------|---------|-------------|
| **OpenAI** | gpt-4o-mini, gpt-4o | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | claude-3-5-haiku-latest, claude-3-5-sonnet-latest | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **Google Gemini** | gemini-1.5-flash, gemini-1.5-pro | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **DeepSeek** | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **火山引擎** | - | [console.volcengine.com](https://console.volcengine.com/) |
| **智谱AI** | glm-4-flash | [open.bigmodel.cn](https://open.bigmodel.cn/usercenter/apikeys) |

## ⚙️ 聊天参数设置

您可以在设置中调整以下聊天参数：

- **温度（Temperature）**: 0.0 - 2.0，控制回复的创造性
  - 较低值（0.2-0.5）：更确定、更保守
  - 较高值（0.7-1.0）：更有创意、更多样

- **最大令牌数（Max Tokens）**: 控制单次回复的最大长度
  - 推荐：2048 - 4096

- **上下文数目（Context Count）**: 保留多少轮历史对话
  - 推荐：5 - 15 轮
  - 设为 0 则不包含历史上下文

- **系统提示词（System Prompt）**: 定义 AI 的角色和行为
  - 默认：`You are a helpful assistant.`

## 🔧 常见问题

### Q: 发送消息时提示 "ALAPICallError"

**原因**：未配置或配置了无效的 API Key

**解决方法**：
1. 前往设置 → AI 提供商
2. 检查 API Key 是否正确填写
3. 确认 API Key 未过期且有足够配额

### Q: 消息一直显示"正在思考..."

**可能原因**：
1. 网络连接问题
2. API Key 配额用尽
3. 提供商服务异常

**解决方法**：
1. 检查网络连接
2. 查看控制台错误日志
3. 尝试切换其他提供商

### Q: 如何停止 AI 正在生成的回复？

点击发送按钮（在生成时会变成红色停止按钮）即可中断生成。

### Q: 如何查看历史对话？

所有对话都会自动保存到本地数据库。点击右上角的话题列表按钮可以查看和切换历史对话。

## 📱 功能特性

### ✅ 已实现

- ✨ 实时流式响应显示
- 💬 多轮对话上下文管理
- 🎯 消息状态可视化（发送中、已发送、失败）
- ⏹️ 支持中断生成
- 📊 自动滚动到最新消息
- 🗂️ 话题管理和历史记录
- ⚙️ 灵活的聊天参数配置

### 🚧 开发中

- 📎 附件上传（图片、文件）
- 🎙️ 语音输入
- 📋 消息复制和分享
- 🔍 对话搜索
- 📑 消息导出

## 🛠️ 技术说明

### 架构

- **AI SDK**: Vercel AI SDK v5
- **数据库**: SQLite（本地存储）
- **支持平台**: iOS、Android、Web

### 消息流程

1. 用户输入消息 → 保存到数据库（status: sent）
2. 创建 AI 消息占位符（status: pending）
3. 调用 AI API 开始流式生成
4. 实时更新消息内容（每500ms轮询）
5. 生成完成，更新状态（status: sent）

### 错误处理

应用会捕获以下类型的错误并给出友好提示：

- API Key 认证错误
- 网络连接错误
- 请求超时错误
- 配额限制错误

## 📞 获取帮助

如果您遇到问题或有功能建议，请：

1. 查看控制台错误日志
2. 检查 API Key 配置
3. 提交 Issue 到项目仓库

---

**更新时间**: 2025-11-03
**版本**: v1.0.0
