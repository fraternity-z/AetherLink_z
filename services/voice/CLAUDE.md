[根目录](../../CLAUDE.md) > [services](../) > **voice**

# Voice 语音识别服务模块

## 模块职责

语音识别服务模块 (`services/voice/`) 负责将录制的音频转换为文本，支持多种识别提供商（设备端和云端），为语音输入功能提供核心识别能力。

## 核心功能

- 🎯 **统一接口**: 提供标准化的语音识别接口，屏蔽不同提供商的实现差异
- 📱 **设备端识别**: 使用 `@react-native-voice/voice` 进行本地实时语音识别（iOS/Android）
- ☁️ **云端识别**: 集成 OpenAI Whisper API 进行高精度音频转文字
- 🌍 **多语言支持**: 支持中文、英文、日文、韩文及自动语言检测
- ⚡ **实时反馈**: 设备端识别支持部分结果实时显示
- 🔧 **灵活配置**: 通过设置页面配置识别提供商、语言等参数

## 架构设计

### 接口层次

```
┌─────────────────────────────────────────┐
│         use-voice-recognition.ts        │  ← React Hook 层
│     (统一的语音识别 Hook 接口)            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        VoiceRecognition.ts              │  ← 接口定义层
│  (IVoiceRecognitionService 接口)        │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌──────────────────┐  ┌──────────────────┐
│ NativeRecognition│  │ WhisperRecognition│  ← 实现层
│   (设备端识别)    │  │   (云端识别)      │
└──────────────────┘  └──────────────────┘
```

### 核心文件

| 文件名 | 职责 | 依赖 |
|--------|------|------|
| `VoiceRecognition.ts` | 接口定义、类型定义、错误类 | 无 |
| `NativeRecognition.ts` | 设备端识别实现 | `@react-native-voice/voice` |
| `WhisperRecognition.ts` | Whisper API 识别实现 | `fetch API` |
| `use-voice-recognition.ts` | React Hook 封装 | 以上所有 |

## 接口定义

### IVoiceRecognitionService

```typescript
export interface IVoiceRecognitionService {
  /**
   * 从音频文件识别文本
   * @param audioUri 音频文件 URI
   * @param config 识别配置
   * @returns 识别结果
   */
  recognizeFromFile(
    audioUri: string,
    config: VoiceRecognitionConfig
  ): Promise<VoiceRecognitionResult>;

  /**
   * 检查服务是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;
}
```

### VoiceRecognitionResult

```typescript
export interface VoiceRecognitionResult {
  /** 识别的文本内容 */
  text: string;
  /** 是否为最终结果（false 表示部分结果） */
  isFinal: boolean;
  /** 置信度 (0-1)，可选 */
  confidence?: number;
}
```

### VoiceRecognitionConfig

```typescript
export interface VoiceRecognitionConfig {
  /** 识别语言，'auto' 表示自动检测 */
  language: 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  /** 是否显示部分识别结果（实时反馈） */
  showPartialResults?: boolean;
  /** 最大音频时长（秒），用于 Whisper API */
  maxDuration?: number;
}
```

## 实现方案

### 1. NativeRecognition (设备端识别)

**技术栈**: `@react-native-voice/voice`

**优点**:
- ⚡ 实时响应，无网络延迟
- 💰 完全免费，无 API 调用成本
- 🔒 隐私保护，音频不上传云端
- 📶 离线可用

**缺点**:
- 🎯 识别准确率中等（依赖系统语音引擎）
- 🌐 语言支持取决于设备系统
- ⏱️ 仅支持实时识别，无法识别已录制的音频文件

**工作流程**:
```
1. 检查权限 (use-microphone-permission)
2. 启动语音识别监听
3. 开始录音（同时识别）
4. 接收部分结果回调 → 实时显示
5. 接收最终结果回调 → 返回完整文本
6. 停止识别
```

**适用场景**:
- 用户选择"设备端识别"
- 需要实时反馈的短语音输入
- 网络不稳定或离线环境

### 2. WhisperRecognition (云端识别)

**技术栈**: OpenAI Whisper API

**优点**:
- 🎯 识别准确率极高
- 🌍 支持 99+ 种语言
- 📝 适合长音频转写
- 🔤 自动标点、分段

**缺点**:
- 💰 按使用量收费（$0.006/分钟）
- 📶 需要网络连接
- ⏳ 有一定延迟（取决于网络和音频长度）

**工作流程**:
```
1. 录音完成后停止
2. 读取音频文件
3. 上传到 Whisper API (multipart/form-data)
4. 等待识别结果
5. 返回识别文本
```

**API 规格**:
- **端点**: `https://api.openai.com/v1/audio/transcriptions`
- **方法**: `POST`
- **格式**: `multipart/form-data`
- **参数**:
  - `file`: 音频文件 (支持 mp3, mp4, mpeg, mpga, m4a, wav, webm)
  - `model`: `whisper-1`
  - `language`: 语言代码（可选，auto 时不传）
  - `response_format`: `json` | `text` | `verbose_json`

**适用场景**:
- 用户选择"Whisper API"
- 需要高精度识别
- 长音频转写（如会议录音）
- 专业内容识别

## 使用示例

### Hook 层使用

```typescript
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';

function VoiceInputDialog() {
  const { recognize, isRecognizing, error } = useVoiceRecognition();

  const handleRecordingComplete = async (audioUri: string) => {
    try {
      const result = await recognize(audioUri);
      console.log('识别结果:', result.text);
      onTextRecognized(result.text);
    } catch (err) {
      console.error('识别失败:', err);
    }
  };

  return (
    <View>
      {isRecognizing && <ActivityIndicator />}
      {error && <Text>{error.message}</Text>}
    </View>
  );
}
```

### 直接使用服务层

```typescript
import { NativeRecognition } from '@/services/voice/NativeRecognition';
import { WhisperRecognition } from '@/services/voice/WhisperRecognition';

// 设备端识别
const nativeService = new NativeRecognition();
const result1 = await nativeService.recognizeFromFile(audioUri, {
  language: 'zh-CN',
  showPartialResults: true,
});

// Whisper API 识别
const whisperService = new WhisperRecognition('sk-xxx...');
const result2 = await whisperService.recognizeFromFile(audioUri, {
  language: 'auto',
  maxDuration: 120,
});
```

## 配置与设置

### 设置项 (storage/repositories/settings.ts)

```typescript
enum SettingKey {
  // 语音识别提供商: 'native' | 'whisper'
  VoiceProvider = 'al:settings:voice_provider',

  // 识别语言: 'auto' | 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR'
  VoiceLanguage = 'al:settings:voice_language',

  // 是否显示部分结果（仅设备端）
  VoiceShowPartial = 'al:settings:voice_show_partial',

  // 录音最大时长（秒）
  VoiceMaxDuration = 'al:settings:voice_max_duration',

  // 识别后是否自动发送
  VoiceAutoSend = 'al:settings:voice_auto_send',
}
```

### 默认配置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| VoiceProvider | `'native'` | 优先使用设备端识别 |
| VoiceLanguage | `'auto'` | 自动检测语言 |
| VoiceShowPartial | `true` | 启用实时反馈 |
| VoiceMaxDuration | `120` | 最长 2 分钟 |
| VoiceAutoSend | `false` | 手动确认后发送 |

## 错误处理

### 错误类型

```typescript
export enum VoiceRecognitionErrorCode {
  PERMISSION_DENIED = 'permission_denied',      // 权限被拒绝
  NETWORK_ERROR = 'network_error',              // 网络错误
  SERVICE_UNAVAILABLE = 'service_unavailable',  // 服务不可用
  INVALID_AUDIO = 'invalid_audio',              // 音频格式错误
  TIMEOUT = 'timeout',                          // 识别超时
  UNKNOWN = 'unknown',                          // 未知错误
}
```

### 错误处理示例

```typescript
try {
  const result = await recognize(audioUri);
} catch (error) {
  if (error instanceof VoiceRecognitionError) {
    switch (error.code) {
      case VoiceRecognitionErrorCode.PERMISSION_DENIED:
        showAlert('需要麦克风权限');
        break;
      case VoiceRecognitionErrorCode.NETWORK_ERROR:
        showAlert('网络错误，请检查网络连接');
        break;
      case VoiceRecognitionErrorCode.SERVICE_UNAVAILABLE:
        showAlert('识别服务暂时不可用');
        break;
      default:
        showAlert('识别失败，请重试');
    }
  }
}
```

## 性能优化

### 1. 音频预处理
- 压缩音频文件大小
- 转换为最优格式（Whisper: m4a/mp3）
- 移除静音段

### 2. 网络优化（Whisper）
- 使用流式上传减少内存占用
- 添加请求超时控制
- 实现请求重试机制
- 考虑音频分段处理（长音频）

### 3. 用户体验优化
- 显示识别进度提示
- 实时显示部分结果（设备端）
- 识别失败时提供降级方案
- 缓存最近识别结果

## 测试策略

### 单元测试
- ✅ 接口定义的类型检查
- ✅ 错误类的正确性
- ✅ 配置验证逻辑
- ⏳ NativeRecognition 的 mock 测试
- ⏳ WhisperRecognition 的 API 调用测试

### 集成测试
- ⏳ 设备端识别端到端流程
- ⏳ Whisper API 真实调用测试
- ⏳ 多语言识别准确性测试
- ⏳ 长音频处理测试

### 用户测试场景
- 📱 不同设备的系统语音引擎测试
- 🌐 不同语言的识别准确率对比
- 📶 弱网络环境的降级处理
- 🔊 不同噪音环境的识别效果

## 依赖关系

### 外部依赖
```json
{
  "@react-native-voice/voice": "^3.x.x",
  "expo-audio": "^15.x.x",
  "expo-file-system": "^18.x.x"  // 用于读取音频文件
}
```

### 内部依赖
- `hooks/use-microphone-permission.ts` - 权限管理
- `hooks/use-voice-recording.ts` - 录音控制
- `storage/repositories/settings.ts` - 配置管理
- `utils/logger.ts` - 日志记录

## 常见问题 (FAQ)

### Q1: 为什么设备端识别无法识别已录制的音频？
**A**: `@react-native-voice/voice` 只支持实时识别，必须在录音时同步进行识别。如需识别录制好的音频，请使用 Whisper API。

### Q2: Whisper API 识别很慢怎么办？
**A**:
1. 检查网络连接质量
2. 压缩音频文件减小上传大小
3. 考虑使用 Azure Speech Service 等更快的替代方案
4. 优化音频格式（推荐 m4a）

### Q3: 如何提高识别准确率？
**A**:
- **设备端**: 在安静环境录音，说话清晰
- **Whisper**: 提供语言参数（不使用 auto），确保音频质量

### Q4: 支持哪些音频格式？
**A**:
- **设备端**: 由系统决定，通常支持常见格式
- **Whisper API**: mp3, mp4, mpeg, mpga, m4a, wav, webm（最大 25 MB）

### Q5: 如何集成其他识别服务？
**A**: 实现 `IVoiceRecognitionService` 接口，创建新的服务类，然后在 Hook 中添加选择逻辑。

## 未来扩展

### 短期计划
- ✅ 实现基础的设备端和 Whisper 识别
- ⏳ 添加识别历史记录
- ⏳ 实现音频文件缓存管理
- ⏳ 优化长音频处理

### 长期愿景
- 🔮 支持更多云端服务（Google Speech-to-Text, Azure Speech）
- 🔮 离线识别模型集成（如 Vosk）
- 🔮 实时字幕显示
- 🔮 语音指令识别（快捷操作）
- 🔮 多人对话识别（说话人分离）
- 🔮 语音情感分析

## 相关文件清单

### 核心文件
- `VoiceRecognition.ts` - 接口定义和类型
- `NativeRecognition.ts` - 设备端识别实现
- `WhisperRecognition.ts` - Whisper API 实现
- `use-voice-recognition.ts` - React Hook 封装

### 配置文件
- `storage/repositories/settings.ts` - 设置键定义
- `app/settings/voice-settings.tsx` - 设置页面

### 相关 Hooks
- `hooks/use-microphone-permission.ts` - 权限管理
- `hooks/use-voice-recording.ts` - 录音控制

### UI 组件
- `components/chat/VoiceInputButton.tsx` - 麦克风按钮
- `components/chat/VoiceInputDialog.tsx` - 录音对话框

## 变更记录 (Changelog)

### 2025-11-10
- 🎉 创建语音识别模块文档
- 📝 定义统一的 `IVoiceRecognitionService` 接口
- 📐 设计设备端和云端双重识别方案
- 🎯 规划实现路径和测试策略
