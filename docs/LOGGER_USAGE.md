# 日志系统使用指南

## 概述

本项目采用统一的日志管理系统，提供以下特性：

- 🎯 **统一接口**：替代直接使用 `console.*`，提供一致的日志API
- 🚀 **自动优化**：生产环境自动移除 console 语句，减小包体积
- 📊 **日志分级**：支持 debug、info、warn、error 四个日志级别
- 🔧 **可扩展**：预留接口，方便后续接入第三方日志服务
- 🎨 **开发友好**：开发环境保留完整日志输出，便于调试

## 快速开始

### 基础用法

```typescript
import { logger } from '@/utils/logger';

// 调试信息（开发环境可见）
logger.debug('用户点击了按钮', { buttonId: 'submit' });

// 普通信息
logger.info('数据加载成功', { count: 10 });

// 警告信息
logger.warn('API 响应较慢', { duration: 3000 });

// 错误信息
logger.error('网络请求失败', new Error('Network timeout'));
```

### 在组件中使用

```typescript
import React, { useEffect } from 'react';
import { logger } from '@/utils/logger';

export function ChatInput() {
  useEffect(() => {
    logger.debug('ChatInput 组件已挂载');

    return () => {
      logger.debug('ChatInput 组件已卸载');
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    try {
      logger.info('发送消息', { length: text.length });
      await sendMessage(text);
      logger.info('消息发送成功');
    } catch (error) {
      logger.error('消息发送失败', error);
    }
  };

  return (
    // ... JSX
  );
}
```

### 在 Service 层使用

```typescript
import { logger } from '@/utils/logger';

export class AiClient {
  async sendMessage(message: string) {
    logger.debug('AiClient.sendMessage 调用', {
      messageLength: message.length,
      timestamp: Date.now()
    });

    try {
      const response = await this.apiCall(message);
      logger.info('AI 响应成功', {
        responseLength: response.length
      });
      return response;
    } catch (error) {
      logger.error('AI 请求失败', error, {
        context: { message }
      });
      throw error;
    }
  }
}
```

## API 参考

### logger.debug(message, data?)

**用途**：输出调试信息，仅在开发环境显示

**参数**：
- `message` (string): 日志消息
- `data` (any, 可选): 附加数据对象

**示例**：
```typescript
logger.debug('函数调用跟踪', {
  function: 'handleUserInput',
  params: { text: 'hello' }
});
```

---

### logger.info(message, data?)

**用途**：输出普通信息，记录正常流程

**参数**：
- `message` (string): 日志消息
- `data` (any, 可选): 附加数据对象

**示例**：
```typescript
logger.info('用户登录成功', { userId: '12345' });
```

---

### logger.warn(message, data?)

**用途**：输出警告信息，标记潜在问题

**参数**：
- `message` (string): 日志消息
- `data` (any, 可选): 附加数据对象

**示例**：
```typescript
logger.warn('API 密钥即将过期', {
  expiresIn: '7 days'
});
```

---

### logger.error(message, error?, context?)

**用途**：输出错误信息，记录异常和错误

**参数**：
- `message` (string): 错误描述
- `error` (Error | unknown, 可选): 错误对象
- `context` (any, 可选): 错误上下文信息

**示例**：
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('操作执行失败', error, {
    context: {
      operation: 'riskyOperation',
      timestamp: Date.now()
    }
  });
}
```

## 最佳实践

### ✅ 推荐做法

1. **使用合适的日志级别**
   ```typescript
   // ✅ 调试信息用 debug
   logger.debug('进入函数', { params });

   // ✅ 业务流程用 info
   logger.info('订单创建成功', { orderId });

   // ✅ 警告用 warn
   logger.warn('缓存未命中', { key });

   // ✅ 错误用 error
   logger.error('支付失败', error);
   ```

2. **提供结构化数据**
   ```typescript
   // ✅ 传递对象，便于后续分析
   logger.info('搜索执行', {
     query: 'React Native',
     engine: 'bing',
     results: 10,
     duration: 234
   });

   // ❌ 拼接字符串，不利于数据分析
   logger.info('搜索: React Native, 引擎: bing');
   ```

3. **错误处理完整**
   ```typescript
   // ✅ 传递完整的错误对象和上下文
   logger.error('数据库查询失败', error, {
     context: {
       table: 'messages',
       operation: 'INSERT'
     }
   });
   ```

4. **避免敏感信息**
   ```typescript
   // ✅ 脱敏处理
   logger.info('用户登录', {
     userId: user.id,
     email: maskEmail(user.email)
   });

   // ❌ 直接输出敏感信息
   logger.info('用户登录', {
     password: user.password // 危险！
   });
   ```

### ❌ 避免的做法

1. **不要直接使用 console**
   ```typescript
   // ❌ 绕过日志系统
   console.log('直接输出');

   // ✅ 使用统一日志
   logger.debug('统一日志');
   ```

2. **不要过度日志**
   ```typescript
   // ❌ 循环中输出大量日志
   items.forEach(item => {
     logger.debug('处理项目', item); // 可能输出成千上万条
   });

   // ✅ 汇总后输出
   logger.debug('批量处理', {
     total: items.length,
     sample: items.slice(0, 3)
   });
   ```

3. **不要在日志中执行副作用**
   ```typescript
   // ❌ 日志参数有副作用
   logger.debug('数据', fetchData()); // fetchData 总会执行

   // ✅ 先计算再记录
   const data = fetchData();
   logger.debug('数据', data);
   ```

## 生产环境优化

### Babel 插件配置

项目已配置 `babel-plugin-transform-remove-console`，在生产构建时自动移除以下语句：

- ✅ 移除: `console.log()`, `console.debug()`, `console.info()`, `console.warn()`
- ⚠️ 保留: `console.error()` (用于捕获关键错误)

**配置文件**: `babel.config.js`

```javascript
module.exports = function(api) {
  const isProduction = api.env('production');

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isProduction ? [
        ['transform-remove-console', {
          exclude: ['error'] // 保留 console.error
        }]
      ] : [])
    ]
  };
};
```

### 性能影响

- **开发环境**: 完整日志输出，无性能影响
- **生产环境**:
  - 移除所有 debug/info/warn 日志代码
  - 包体积减少约 2-5 KB (取决于日志数量)
  - 运行时零开销 (代码已移除)

## 未来扩展

### 接入第三方日志服务

预留扩展点，后续可接入 Sentry、LogRocket 等服务：

```typescript
// utils/logger.ts (未来扩展示例)
import * as Sentry from '@sentry/react-native';

const logToRemote = (level: string, message: string, data?: any) => {
  if (__DEV__) return; // 仅生产环境上报

  Sentry.captureMessage(message, {
    level: level as any,
    extra: data
  });
};

export const logger = {
  error: (message: string, error?: Error, context?: any) => {
    console.error(message, error, context);
    logToRemote('error', message, { error, context }); // 上报到远程
  },
  // ...
};
```

### 日志持久化

可扩展为支持本地日志存储：

```typescript
import * as FileSystem from 'expo-file-system';

const saveLogToFile = async (log: LogEntry) => {
  const logFile = `${FileSystem.documentDirectory}app.log`;
  await FileSystem.appendAsync(logFile, JSON.stringify(log) + '\n');
};
```

## 迁移指南

### 从 console.* 迁移到 logger

使用正则表达式批量替换：

1. **查找**: `console\.log\((.*?)\)`
2. **替换**: `logger.debug($1)`

3. **查找**: `console\.info\((.*?)\)`
4. **替换**: `logger.info($1)`

5. **查找**: `console\.warn\((.*?)\)`
6. **替换**: `logger.warn($1)`

7. **查找**: `console\.error\((.*?)\)`
8. **替换**: `logger.error($1)`

**注意**:
- 复杂的日志语句可能需要手动调整
- 检查是否需要传递额外的 data 或 context 参数
- 确保导入 `import { logger } from '@/utils/logger';`

## 常见问题 (FAQ)

### Q: 为什么要用 logger 而不是直接用 console？

**A**:
1. **统一管理**: 日志格式、级别、输出目标统一控制
2. **生产优化**: 自动移除调试日志，减小包体积
3. **可扩展**: 方便接入第三方日志服务（如 Sentry）
4. **类型安全**: TypeScript 类型提示，避免错误

---

### Q: 生产环境还能看到日志吗？

**A**:
- `console.error()` 会保留，可在崩溃报告中查看
- 其他级别的日志会被完全移除
- 如需生产日志，可接入远程日志服务（如 Sentry）

---

### Q: logger 会影响性能吗？

**A**:
- **开发环境**: 与 console 性能相同，可忽略不计
- **生产环境**: 代码被完全移除，零性能开销

---

### Q: 如何在特定条件下禁用日志？

**A**:
```typescript
// 可根据配置动态控制
const shouldLog = __DEV__ || settings.enableDebugLog;

if (shouldLog) {
  logger.debug('调试信息', data);
}
```

---

### Q: 如何给日志添加用户信息？

**A**:
```typescript
// 在日志中附加用户上下文
logger.info('操作执行', {
  userId: currentUser.id,
  username: currentUser.name,
  action: 'delete_message'
});
```

## 相关文档

- [项目架构文档](../CLAUDE.md)
- [编码规范](../CLAUDE.md#编码规范)
- [弹窗系统使用指南](./DIALOG_USAGE.md)
- [思考链功能文档](./THINKING_CHAIN.md)

---

**最后更新**: 2025-11-09
**维护者**: AetherLink_z 开发团队
**版本**: 1.0.0
