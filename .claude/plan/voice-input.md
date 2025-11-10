# 语音输入功能实施规划

## 功能概述

在聊天输入框区域添加语音输入功能,允许用户通过语音方式输入消息。麦克风按钮位于发送按钮旁边，点击后弹出录音对话框。

**平台支持**: iOS、Android（不包括 Web）

## 目标定义

### 核心价值
- 🎤 提供便捷的语音输入方式,解放双手
- 🌍 支持多语言语音识别
- ⚡ 快速响应,流畅的用户体验
- 🔒 保护用户隐私,本地优先处理
- ⚙️ 灵活配置,用户可在设置中选择识别提供商

### 用户体验目标
- 点击麦克风按钮弹出录音对话框
- 实时显示录音时长
- 录音结束后自动转换为文字
- 支持编辑识别结果
- 提供友好的错误提示
- 在设置页面配置语音功能参数

### 技术可行性
- ✅ Expo SDK 54 支持音频录制 (expo-av)
- ✅ React Native 社区有成熟的语音识别库
- ✅ OpenAI Whisper API 提供云端识别备选方案
- ✅ 项目已有 OpenAI 集成,可复用 API Key
- ✅ 项目已有 voice-settings.tsx 占位页面

## 技术方案设计

### 技术选型

#### 音频录制方案
**选择: expo-av**
- ✅ Expo 官方支持
- ✅ iOS/Android 跨平台兼容
- ✅ 完善的文档和示例
- ✅ 支持高质量录音
- ✅ 无需额外原生模块配置

**安装命令:**
```bash
npx expo install expo-av
```

#### 语音识别方案

**双方案策略（用户可在设置中选择）:**

**方案 1: 设备端识别 (iOS/Android)**
- **库**: `@react-native-voice/voice`
- **优点**:
  - 响应速度快 (< 3s)
  - 免费,无 API 费用
  - 保护隐私,本地处理
  - 支持实时识别
- **缺点**:
  - 识别准确率可能低于云端
  - 需要分平台实现
  - 嘈杂环境下可能失败

**方案 2: 云端识别 (Whisper API)**
- **API**: OpenAI Whisper
- **优点**:
  - 识别准确率高 (>90%)
  - 跨平台统一实现
  - 多语言支持优秀
  - 嘈杂环境下表现好
- **缺点**:
  - 需要网络连接
  - 有 API 费用 ($0.006/分钟)
  - 响应延迟较高 (5-10s)

**默认策略**: 设备端优先,Whisper 备选（用户可在设置中修改）

**安装命令:**
```bash
npm install @react-native-voice/voice
```

### 权限管理

#### app.json 配置
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "需要访问麦克风以实现语音输入功能"
      }
    },
    "android": {
      "permissions": ["RECORD_AUDIO"]
    }
  }
}
```

#### 权限请求策略
1. 首次点击麦克风按钮时请求权限
2. 显示友好的权限说明对话框
3. 权限被拒后提供"去设置"引导按钮
4. 每次录音前检查权限状态

### 设置页面设计

#### 语音功能设置 (voice-settings.tsx)

**配置项:**

1. **语音识别提供商** (必选)
   - 选项: "设备端识别（免费）" | "OpenAI Whisper（高准确率）"
   - 默认: 设备端识别

2. **识别语言** (必选)
   - 选项: "自动检测" | "中文" | "英文" | "日文" | ...
   - 默认: 自动检测（使用系统语言）

3. **录音最大时长** (必选)
   - 选项: 60s | 120s | 180s | 300s
   - 默认: 120s

4. **Whisper API 配置** (可选,仅当选择 Whisper 时显示)
   - API Key: 复用现有 OpenAI API Key 或单独配置
   - 提示费用: 显示"约 $0.006/分钟"

5. **其他选项**
   - 自动发送: 识别完成后自动发送消息（默认关闭）
   - 显示实时识别: 录音时显示部分识别结果（默认开启，仅设备端）

**UI 布局示例:**
```tsx
<SettingScreen title="语音功能" description="语音识别和文本转语音设置">
  <List.Section>
    <List.Subheader>语音识别</List.Subheader>

    {/* 识别提供商 */}
    <List.Item
      title="识别提供商"
      description={provider === 'native' ? '设备端识别（免费）' : 'OpenAI Whisper（高准确率）'}
      left={props => <List.Icon {...props} icon="microphone" />}
      onPress={showProviderPicker}
    />

    {/* 识别语言 */}
    <List.Item
      title="识别语言"
      description={language === 'auto' ? '自动检测' : language}
      left={props => <List.Icon {...props} icon="translate" />}
      onPress={showLanguagePicker}
    />

    {/* 录音最大时长 */}
    <List.Item
      title="录音最大时长"
      description={`${maxDuration} 秒`}
      left={props => <List.Icon {...props} icon="timer" />}
      onPress={showDurationPicker}
    />

    {/* Whisper API 配置（条件显示） */}
    {provider === 'whisper' && (
      <>
        <List.Item
          title="API 密钥配置"
          description="复用 OpenAI API Key"
          left={props => <List.Icon {...props} icon="key" />}
          onPress={showApiKeyConfig}
        />
        <List.Item
          title="费用说明"
          description="约 $0.006/分钟"
          left={props => <List.Icon {...props} icon="cash" />}
        />
      </>
    )}

    {/* 自动发送 */}
    <List.Item
      title="自动发送"
      description="识别完成后自动发送消息"
      left={props => <List.Icon {...props} icon="send-check" />}
      right={() => <Switch value={autoSend} onValueChange={setAutoSend} />}
    />

    {/* 显示实时识别 */}
    <List.Item
      title="显示实时识别"
      description="录音时显示部分识别结果"
      left={props => <List.Icon {...props} icon="eye" />}
      right={() => <Switch value={showPartial} onValueChange={setShowPartial} />}
      disabled={provider === 'whisper'}
    />
  </List.Section>
</SettingScreen>
```

### 数据流设计

```
用户点击麦克风按钮
  ↓
检查麦克风权限
  ↓ (已授权)
弹出录音对话框
  ↓
开始录音 (expo-av)
  ↓
显示录音时长计时器
  ↓
[可选] 显示实时识别结果（设备端）
  ↓
用户点击停止
  ↓
停止录音,获取音频文件
  ↓
根据设置选择识别方案
  ↓
语音识别 (设备端/Whisper)
  ↓
显示识别结果
  ↓
填充到聊天输入框
  ↓
[可选] 自动发送 或 用户编辑/发送
```

## UI/UX 设计规范

### 交互方式
**点击弹出录音对话框**

**理由:**
- ✅ 不占用聊天输入框空间
- ✅ 可以显示更丰富的录音状态
- ✅ 避免误触导致录音
- ✅ 更符合移动端操作习惯

### 视觉设计

#### 麦克风按钮
- **位置**: 发送按钮左侧
- **图标**: Material Icons `microphone`
- **大小**: 40x40 dp
- **颜色**: 主题色
- **状态**:
  - 默认: 灰色图标
  - 悬停: 主题色图标
  - 禁用: 浅灰色图标（权限未授予）

#### 录音对话框
- **样式**: 半透明遮罩 + 居中卡片
- **布局**:
  ```
  ┌─────────────────────────┐
  │     录音中...           │
  │                         │
  │     [麦克风图标]        │
  │     (脉冲动画)          │
  │                         │
  │     00:15 / 02:00       │
  │   (当前时长/最大时长)   │
  │                         │
  │  [可选] 实时识别文本    │
  │                         │
  │  [停止录音]  [取消]     │
  └─────────────────────────┘
  ```
- **动画**:
  - 弹出: 从底部滑入 (200ms)
  - 关闭: 淡出 (150ms)
  - 录音时: 麦克风图标脉冲效果

#### 识别状态
- **识别中**: 显示加载动画 + "正在识别..."
- **识别成功**: 显示识别文本 + 对勾图标
- **识别失败**: 显示错误提示 + "重试"按钮

### 状态反馈

| 状态 | 视觉反馈 | 文本提示 |
|------|----------|----------|
| 权限未授权 | 麦克风图标禁用 | "需要麦克风权限" |
| 准备录音 | 麦克风图标正常 | - |
| 录音中 | 红色脉冲动画 + 计时器 | "录音中..." |
| 识别中 | 加载动画 | "正在识别..." |
| 识别成功 | 文本显示 + 对勾图标 | 识别结果 |
| 识别失败 | 错误图标 + 重试按钮 | "识别失败,请重试" |
| 权限被拒 | 禁止图标 + 设置按钮 | "请在设置中开启麦克风权限" |
| 时长超限 | 自动停止 + 提示 | "已达到最大录音时长" |

## 功能模块分解

### 模块 1: UI 组件层
- `VoiceInputButton.tsx` - 麦克风按钮组件
- `VoiceInputDialog.tsx` - 录音对话框组件
- `RecordingTimer.tsx` - 录音计时器组件（可选独立组件）

### 模块 2: 逻辑层 (Hooks)
- `use-voice-recording.ts` - 录音控制逻辑
- `use-microphone-permission.ts` - 权限管理逻辑
- `use-voice-recognition.ts` - 语音识别逻辑（统一接口）
- `use-voice-settings.ts` - 语音设置读取 Hook

### 模块 3: 服务层
- `services/voice/VoiceRecognitionService.ts` - 识别服务抽象接口
- `services/voice/NativeRecognition.ts` - 设备端识别实现
- `services/voice/WhisperRecognition.ts` - Whisper API 实现
- `services/voice/index.ts` - 服务统一导出

### 模块 4: 工具层
- `utils/permissions.ts` - 跨平台权限请求封装
- `utils/audio-converter.ts` - 音频格式转换工具（可选）

### 模块 5: 存储层
- `storage/repositories/settings.ts` - 扩展语音设置存储（已有，需扩展）

## 实施步骤规划

### 阶段 1: 依赖安装和基础配置 (预估 2 小时)

#### 任务 1.1: 安装必要依赖
```bash
# 音频录制
npx expo install expo-av

# 语音识别
npm install @react-native-voice/voice

# 动画库（如果未安装）
npx expo install react-native-reanimated
```

#### 任务 1.2: 配置权限
- 修改 `app.json` 添加麦克风权限配置
- iOS: 添加 `NSMicrophoneUsageDescription`
- Android: 添加 `RECORD_AUDIO` 权限

#### 任务 1.3: 环境验证
- 测试 expo-av 录音功能
- 测试 @react-native-voice/voice 识别功能
- 确认 iOS/Android 平台兼容性

**输出**:
- 依赖安装完成
- 权限配置完成
- 环境测试通过

**涉及文件**:
- `package.json`
- `app.json`

---

### 阶段 2: 设置页面实现 (预估 4 小时)

#### 任务 2.1: 完善语音设置页面

**目标**: 实现完整的语音设置页面，包含所有配置项

**功能需求**:
1. 识别提供商选择（设备端 vs Whisper）
2. 识别语言选择（自动检测、中文、英文等）
3. 录音最大时长设置
4. Whisper API 配置（条件显示）
5. 自动发送开关
6. 显示实时识别开关

**技术实现**:
```typescript
// app/settings/voice-settings.tsx
export default function VoiceSettings() {
  const [provider, setProvider] = useState<'native' | 'whisper'>('native');
  const [language, setLanguage] = useState<string>('auto');
  const [maxDuration, setMaxDuration] = useState<number>(120);
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [showPartial, setShowPartial] = useState<boolean>(true);

  // 保存/加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const sr = SettingsRepository();
    // 读取设置
  };

  const saveSettings = async () => {
    const sr = SettingsRepository();
    // 保存设置
  };

  return (
    <SettingScreen title="语音功能" description="语音识别配置">
      {/* UI 实现 */}
    </SettingScreen>
  );
}
```

**输出**: 完整的语音设置页面

**涉及文件**:
- `app/settings/voice-settings.tsx` (修改)
- `storage/repositories/settings.ts` (扩展,添加语音设置键)

**预估工作量**: 4 小时

---

### 阶段 3: 核心功能实现 (预估 1.5 天)

#### 任务 3.1: 权限管理实现

**目标**: 实现麦克风权限请求、状态检查和引导逻辑

**功能需求**:
1. 首次请求: 弹出权限说明对话框 → 请求系统权限
2. 权限被拒: 显示引导对话框,提示用户去设置页面开启
3. 权限状态检查: 录音前检查权限状态

**技术实现**:
```typescript
// hooks/use-microphone-permission.ts
export function useMicrophonePermission() {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  const requestPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setPermissionStatus(status);
    return status === 'granted';
  };

  const checkPermission = async () => {
    const { status } = await Audio.getPermissionsAsync();
    setPermissionStatus(status);
    return status === 'granted';
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return { permissionStatus, requestPermission, checkPermission, openSettings };
}
```

**输出**: 权限管理 Hook

**涉及文件**:
- `hooks/use-microphone-permission.ts` (新建)

**预估工作量**: 3 小时

---

#### 任务 3.2: 录音控制逻辑封装

**目标**: 封装录音开始、停止、取消等核心逻辑

**功能需求**:
1. 录音开始: 检查权限 → 初始化录音器 → 开始录制
2. 录音停止: 停止录制 → 获取音频文件 URI → 返回音频数据
3. 录音取消: 停止录制 → 清理临时文件
4. 时长计时: 实时更新录音时长（每秒更新）
5. 自动停止: 达到最大时长自动停止

**技术实现**:
```typescript
// hooks/use-voice-recording.ts
export function useVoiceRecording(maxDuration: number) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);

      // 启动计时器
      const timer = setInterval(() => {
        setDuration(prev => {
          if (prev + 1 >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

      return timer;
    } catch (error) {
      logger.error('[Recording] Failed to start:', error);
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri);
      setIsRecording(false);
      return uri;
    } catch (error) {
      logger.error('[Recording] Failed to stop:', error);
      throw error;
    }
  };

  const cancelRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      setIsRecording(false);
      setDuration(0);
      setAudioUri(null);
    } catch (error) {
      logger.error('[Recording] Failed to cancel:', error);
    }
  };

  return { isRecording, duration, audioUri, startRecording, stopRecording, cancelRecording };
}
```

**输出**: 录音控制 Hook

**涉及文件**:
- `hooks/use-voice-recording.ts` (新建)

**预估工作量**: 5 小时

---

#### 任务 3.3: UI 组件开发

**目标**: 创建麦克风按钮和录音对话框组件

**组件结构**:
```tsx
// components/chat/ChatInput.tsx (修改)
<View style={styles.inputContainer}>
  <VoiceInputButton onTextRecognized={handleTextRecognized} />
  <TextInput ... />
  <IconButton icon="send" onPress={handleSend} />
</View>

// components/chat/VoiceInputButton.tsx (新建)
export const VoiceInputButton = ({ onTextRecognized }) => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const { permissionStatus, requestPermission } = useMicrophonePermission();

  const handlePress = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setDialogVisible(true);
  };

  return (
    <>
      <IconButton
        icon="microphone"
        onPress={handlePress}
        disabled={permissionStatus === 'denied'}
      />
      <VoiceInputDialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        onTextRecognized={onTextRecognized}
      />
    </>
  );
};

// components/chat/VoiceInputDialog.tsx (新建)
export const VoiceInputDialog = ({ visible, onClose, onTextRecognized }) => {
  const settings = useVoiceSettings();
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecording(settings.maxDuration);
  const { recognizeAudio } = useVoiceRecognition(settings.provider);
  const [recognizedText, setRecognizedText] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [partialText, setPartialText] = useState('');

  useEffect(() => {
    if (visible) {
      startRecording();
    }
  }, [visible]);

  const handleStop = async () => {
    const audioUri = await stopRecording();
    if (!audioUri) return;

    setIsRecognizing(true);
    try {
      const text = await recognizeAudio(audioUri);
      setRecognizedText(text);
      onTextRecognized(text);
      onClose();
    } catch (error) {
      // 错误处理
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleCancel = async () => {
    await cancelRecording();
    onClose();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleCancel}>
        <Dialog.Title>录音中...</Dialog.Title>
        <Dialog.Content>
          {/* 麦克风图标 + 动画 */}
          <View style={styles.iconContainer}>
            <Animated.View style={pulseStyle}>
              <Icon name="microphone" size={64} color="red" />
            </Animated.View>
          </View>

          {/* 计时器 */}
          <Text style={styles.timer}>
            {formatTime(duration)} / {formatTime(settings.maxDuration)}
          </Text>

          {/* 实时识别文本（可选） */}
          {settings.showPartial && partialText && (
            <Text style={styles.partialText}>{partialText}</Text>
          )}

          {/* 识别中状态 */}
          {isRecognizing && <ActivityIndicator />}

          {/* 识别结果 */}
          {recognizedText && <Text>{recognizedText}</Text>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>取消</Button>
          <Button onPress={handleStop} disabled={isRecognizing}>
            停止录音
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
```

**输出**:
- 麦克风按钮组件
- 语音输入对话框组件

**涉及文件**:
- `components/chat/ChatInput.tsx` (修改,集成麦克风按钮)
- `components/chat/VoiceInputButton.tsx` (新建)
- `components/chat/VoiceInputDialog.tsx` (新建)

**预估工作量**: 6 小时

---

### 阶段 4: 语音识别集成 (预估 1.5 天)

#### 任务 4.1: 设备端语音识别实现

**目标**: 集成 `@react-native-voice/voice` 实现本地语音识别

**功能需求**:
1. 实时识别: 边录音边转文字（流式识别）
2. 最终结果: 录音结束后返回最终识别文本
3. 错误处理: 网络错误、识别失败、超时等
4. 多语言支持: 根据设置选择识别语言

**技术实现**:
```typescript
// services/voice/NativeRecognition.ts
import Voice from '@react-native-voice/voice';

export class NativeRecognition {
  private onPartialCallback?: (text: string) => void;
  private onFinalCallback?: (text: string) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor() {
    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value[0]) {
        this.onPartialCallback?.(e.value[0]);
      }
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        this.onFinalCallback?.(e.value[0]);
      }
    };

    Voice.onSpeechError = (e) => {
      this.onErrorCallback?.(new Error(e.error?.message || '识别失败'));
    };
  }

  async startRecognition(language: string) {
    try {
      await Voice.start(language);
    } catch (error) {
      logger.error('[NativeRecognition] Start failed:', error);
      throw error;
    }
  }

  async stopRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.onFinalCallback = resolve;
      this.onErrorCallback = reject;
      Voice.stop();
    });
  }

  onPartialResults(callback: (text: string) => void) {
    this.onPartialCallback = callback;
  }

  async destroy() {
    await Voice.destroy();
  }
}
```

**输出**: 设备端识别服务类

**涉及文件**:
- `services/voice/NativeRecognition.ts` (新建)

**预估工作量**: 6 小时

---

#### 任务 4.2: 云端语音识别实现 (OpenAI Whisper)

**目标**: 集成 OpenAI Whisper API 作为备选方案

**功能需求**:
1. 音频文件上传: 录音结束后上传到 Whisper API
2. 识别结果处理: 解析 API 返回的文本
3. 错误处理: 网络错误、API 限流、余额不足等
4. 加载状态: 显示"正在识别..."提示

**技术实现**:
```typescript
// services/voice/WhisperRecognition.ts
export class WhisperRecognition {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioUri: string, language?: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', 'whisper-1');
      if (language && language !== 'auto') {
        formData.append('language', language);
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '识别失败');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      logger.error('[WhisperRecognition] Transcribe failed:', error);
      throw error;
    }
  }
}
```

**输出**: Whisper 识别服务类

**涉及文件**:
- `services/voice/WhisperRecognition.ts` (新建)

**预估工作量**: 5 小时

---

#### 任务 4.3: 统一识别接口和 Hook

**目标**: 创建统一的语音识别接口,根据设置选择实现

**功能需求**:
1. 根据用户设置选择识别提供商
2. 统一的错误处理
3. 提供 Hook 供组件使用

**技术实现**:
```typescript
// services/voice/index.ts
export interface VoiceRecognitionService {
  startRecognition(language: string): Promise<void>;
  stopRecognition(): Promise<string>;
  onPartialResults?(callback: (text: string) => void): void;
}

export function createVoiceRecognitionService(
  provider: 'native' | 'whisper',
  apiKey?: string
): VoiceRecognitionService {
  if (provider === 'whisper') {
    if (!apiKey) throw new Error('Whisper API Key is required');
    return new WhisperRecognition(apiKey);
  }
  return new NativeRecognition();
}

// hooks/use-voice-recognition.ts
export function useVoiceRecognition(provider: 'native' | 'whisper') {
  const settings = useVoiceSettings();
  const [service] = useState(() =>
    createVoiceRecognitionService(provider, settings.apiKey)
  );

  const recognizeAudio = async (audioUri: string): Promise<string> => {
    try {
      if (provider === 'whisper') {
        return await (service as WhisperRecognition).transcribeAudio(audioUri, settings.language);
      } else {
        await service.startRecognition(settings.language);
        return await service.stopRecognition();
      }
    } catch (error) {
      logger.error('[VoiceRecognition] Failed:', error);
      throw error;
    }
  };

  return { recognizeAudio, service };
}

// hooks/use-voice-settings.ts
export function useVoiceSettings() {
  const [settings, setSettings] = useState({
    provider: 'native' as 'native' | 'whisper',
    language: 'auto',
    maxDuration: 120,
    autoSend: false,
    showPartial: true,
    apiKey: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const sr = SettingsRepository();
    const provider = await sr.get<string>(SettingKey.VoiceProvider) || 'native';
    const language = await sr.get<string>(SettingKey.VoiceLanguage) || 'auto';
    // ... 加载其他设置
    setSettings({ provider, language, ... });
  };

  return settings;
}
```

**输出**:
- 统一识别服务接口
- 语音识别 Hook
- 语音设置 Hook

**涉及文件**:
- `services/voice/index.ts` (新建)
- `hooks/use-voice-recognition.ts` (新建)
- `hooks/use-voice-settings.ts` (新建)
- `storage/repositories/settings.ts` (扩展,添加语音设置键)

**预估工作量**: 5 小时

---

### 阶段 5: 交互优化与测试 (预估 1 天)

#### 任务 5.1: 动画和视觉反馈优化

**目标**: 添加流畅的动画效果,提升用户体验

**动画效果**:
1. **录音按钮脉冲动画**: 使用 `react-native-reanimated` 实现红色脉冲效果
2. **对话框弹出动画**: 从底部滑入,半透明遮罩
3. **计时器数字动画**: 数字更新平滑过渡
4. **错误抖动动画**: 识别失败时按钮抖动

**技术实现**:
```typescript
// components/chat/VoiceInputDialog.tsx
const pulseAnimation = useSharedValue(1);

useEffect(() => {
  if (isRecording) {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1
    );
  } else {
    pulseAnimation.value = withTiming(1, { duration: 200 });
  }
}, [isRecording]);

const pulseStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulseAnimation.value }],
}));
```

**输出**: 动画增强的组件

**涉及文件**:
- `components/chat/VoiceInputDialog.tsx` (修改)

**预估工作量**: 4 小时

---

#### 任务 5.2: 错误处理和边界情况

**目标**: 处理所有异常情况,确保功能稳定性

**错误场景**:
1. **权限被拒**: 显示引导对话框,提示去设置页面开启
2. **录音失败**: 提示"录音失败,请重试"
3. **识别失败**: 提示"识别失败,请重试"或"网络错误"
4. **录音时长过短** (< 1s): 提示"录音时长过短,请重新录制"
5. **网络超时**: 使用 Whisper API 时超时处理
6. **API 余额不足**: 提示用户检查 API 余额
7. **音频格式不支持**: 提示用户（理论上 expo-av 生成的格式都支持）

**技术实现**:
```typescript
// components/chat/VoiceInputDialog.tsx
const handleStop = async () => {
  try {
    if (duration < 1) {
      alert('录音时长过短', '请至少录制 1 秒');
      return;
    }

    const audioUri = await stopRecording();
    if (!audioUri) {
      throw new Error('录音失败');
    }

    setIsRecognizing(true);
    const text = await recognizeAudio(audioUri);

    if (!text || text.trim() === '') {
      throw new Error('未识别到有效内容');
    }

    setRecognizedText(text);
    onTextRecognized(text);

    if (settings.autoSend) {
      onClose();
    }
  } catch (error: any) {
    let errorMessage = '识别失败';

    if (error.message.includes('network')) {
      errorMessage = '网络错误,请检查网络连接';
    } else if (error.message.includes('quota')) {
      errorMessage = 'API 额度不足,请检查账户余额';
    } else if (error.message.includes('timeout')) {
      errorMessage = '识别超时,请重试';
    }

    alert('错误', errorMessage);
    logger.error('[VoiceInputDialog] Recognition failed:', error);
  } finally {
    setIsRecognizing(false);
  }
};
```

**输出**: 完善的错误处理逻辑

**涉及文件**:
- `components/chat/VoiceInputDialog.tsx` (修改)
- `hooks/use-voice-recording.ts` (修改)
- `services/voice/*.ts` (修改,添加错误处理)

**预估工作量**: 4 小时

---

#### 任务 5.3: 跨平台测试和性能优化

**目标**: 在 iOS 和 Android 平台测试功能完整性和性能

**测试清单**:

**iOS 测试**:
- [ ] 权限请求流程正常
- [ ] 录音功能正常（前台/后台）
- [ ] 设备端语音识别准确率
- [ ] Whisper API 识别准确率
- [ ] 动画流畅度
- [ ] 内存占用正常（录音时 < 50MB）
- [ ] 设置页面功能正常

**Android 测试**:
- [ ] 权限请求流程正常
- [ ] 录音功能正常（前台/后台）
- [ ] 设备端语音识别准确率
- [ ] Whisper API 识别准确率
- [ ] 不同厂商设备兼容性（小米、华为、三星）
- [ ] 低端设备性能（录音延迟 < 200ms）
- [ ] 设置页面功能正常

**性能指标**:
- 录音开始延迟 < 500ms
- 设备端识别响应时间 < 3s
- Whisper 识别响应时间 < 10s
- 内存占用 < 50MB
- 音频文件大小 < 5MB/分钟

**优化方向**:
1. 音频压缩: 使用较低的采样率（16kHz）减小文件大小
2. 缓存优化: 缓存权限状态和设置,避免重复读取
3. 懒加载: 语音识别库按需加载
4. 防抖优化: 避免频繁触发录音

**输出**: 测试报告和优化记录

**涉及文件**:
- `docs/VOICE_INPUT_TEST_REPORT.md` (新建,可选)

**预估工作量**: 6 小时

---

## 需要明确的配置选项

### ✅ 已明确
- ❌ **不支持 Web 平台** - 仅 iOS/Android
- ⚙️ **识别提供商在设置中配置** - 用户可选

### ❓ 待确认

#### 1. 识别提供商默认值
**问题**: 首次安装时,默认使用哪种识别方案?

**推荐**: 设备端识别（免费、快速、隐私）

**主人选择**: `[ ]` 设备端识别 `[ ]` Whisper API `[ ]` 其他 _________

---

#### 2. 识别语言默认值
**问题**: 默认识别语言如何确定?

**推荐**: 自动检测（使用系统语言）

**主人选择**: `[ ]` 自动检测 `[ ]` 中文 `[ ]` 英文 `[ ]` 其他 _________

---

#### 3. 录音最大时长默认值
**问题**: 默认最大录音时长?

**推荐**: 120 秒（平衡体验和成本）

**主人选择**: `[ ]` 60s `[ ]` 120s `[ ]` 180s `[ ]` 300s `[ ]` 其他 _________

---

#### 4. Whisper API Key 配置方式
**问题**: 如果用户选择 Whisper,API Key 如何配置?

**方案 A**: 复用现有 OpenAI API Key（从 AI 服务配置读取）
**方案 B**: 单独配置 Whisper API Key（在语音设置中添加输入框）

**推荐**: 方案 A（简单、无需额外配置）

**主人选择**: `[ ]` 方案 A `[ ]` 方案 B `[ ]` 其他 _________

---

#### 5. 自动发送默认值
**问题**: 识别完成后是否自动发送消息?

**推荐**: 关闭（让用户有机会编辑）

**主人选择**: `[ ]` 开启 `[ ]` 关闭

---

## 验收标准

### 功能完整性
- [ ] 麦克风按钮正确显示在聊天输入框中
- [ ] 点击按钮弹出录音对话框
- [ ] 录音功能正常,显示计时器
- [ ] 设备端语音识别成功,文本填充到输入框
- [ ] Whisper 语音识别成功,文本填充到输入框
- [ ] 支持用户编辑识别结果
- [ ] 错误场景有友好提示
- [ ] 设置页面功能完整,可配置所有选项
- [ ] 设置保存/加载正常

### 性能指标
- [ ] 录音开始延迟 < 500ms
- [ ] 设备端识别响应时间 < 3s
- [ ] Whisper 识别响应时间 < 10s
- [ ] 内存占用 < 50MB
- [ ] 音频文件大小 < 5MB/分钟

### 跨平台兼容性
- [ ] iOS 平台功能正常
- [ ] Android 平台功能正常（测试至少 3 款不同厂商设备）
- [ ] 权限请求流程符合平台规范

### 用户体验
- [ ] 交互流畅,无卡顿
- [ ] 动画效果自然
- [ ] 错误提示清晰易懂
- [ ] 支持取消录音
- [ ] 设备端识别准确率 > 80%（中文）
- [ ] Whisper 识别准确率 > 90%（中文）

### 代码质量
- [ ] TypeScript 类型完整,无 any 类型
- [ ] 遵循项目现有代码风格
- [ ] 组件职责单一,可复用
- [ ] 错误处理完善
- [ ] 添加必要的代码注释

---

## 潜在风险和应对

### 风险 1: 语音识别准确率不足

**描述**: 设备端识别在嘈杂环境或方言场景下准确率可能较低。

**影响**: 用户需要频繁修改识别结果,降低使用体验。

**应对措施**:
1. 提供"重新录音"按钮,方便快速重试
2. 在设置中提供"识别提供商"切换选项
3. 优化录音质量（降噪、高采样率）
4. 在设置中添加"推荐使用 Whisper 以获得更高准确率"提示

---

### 风险 2: Whisper API 费用和限流

**描述**: OpenAI Whisper API 按分钟计费,频繁使用可能产生较高费用。

**影响**: 用户成本增加,或触发 API 限流。

**应对措施**:
1. 在设置中显示"语音识别费用说明：约 $0.006/分钟"
2. 限制最大录音时长（默认 120 秒）
3. 默认使用设备端识别,Whisper 作为可选方案
4. 复用用户已配置的 OpenAI API Key
5. 识别失败时提供"切换到设备端识别"选项

---

### 风险 3: 用户隐私和数据安全

**描述**: 语音数据涉及用户隐私,需要妥善处理。

**影响**: 可能违反隐私法规（GDPR、CCPA）,用户信任度下降。

**应对措施**:
1. 录音文件仅存储在本地,识别后立即删除
2. 使用 Whisper API 时在设置中明确说明："使用 Whisper 时,音频数据将上传到 OpenAI 服务器"
3. 在隐私政策中说明语音数据处理方式
4. 不存储原始音频文件到数据库
5. 设备端识别优先,减少云端上传

---

### 风险 4: 低端设备性能问题

**描述**: 低端 Android 设备录音时可能出现卡顿或延迟。

**影响**: 用户体验下降,可能导致录音失败。

**应对措施**:
1. 使用较低的音频采样率（16kHz）减轻负担
2. 录音时暂停不必要的后台任务
3. 测试覆盖低端设备（如 2GB RAM 的 Android 设备）
4. 异步处理识别任务,避免阻塞 UI 线程
5. 在低端设备上默认关闭实时识别功能

---

### 风险 5: 设备端识别库兼容性问题

**描述**: `@react-native-voice/voice` 在某些 Android 设备上可能不兼容。

**影响**: 设备端识别功能无法使用。

**应对措施**:
1. 在启动时检测设备端识别可用性
2. 不可用时自动切换到 Whisper API
3. 在设置中显示"设备端识别不可用"提示
4. 提供详细的错误日志,方便排查问题

---

## 总结

本规划文档提供了语音输入功能的完整实施方案,包括:

- ✅ 5 个开发阶段,共 14 个具体任务
- ✅ 预估总工作量: 约 **5-6 个工作日**
- ✅ iOS/Android 跨平台支持（不含 Web）
- ✅ 双识别方案（设备端 + Whisper API）
- ✅ 完善的语音设置页面
- ✅ 完善的错误处理和边界情况处理
- ✅ 详细的验收标准和测试清单
- ✅ 5 个主要风险点及应对措施

**请主人确认上述"待确认配置选项",浮浮酱就可以开始实施了喵！** o(*￣︶￣*)o