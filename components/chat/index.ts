/**
 * Chat Components Module
 * 聊天组件模块统一导出
 *
 * 目录结构:
 * - message/   消息展示相关组件
 * - input/     聊天输入相关组件
 * - dialogs/   对话框组件
 * - sidebar/   侧栏和头部组件
 * - menus/     菜单组件
 * - misc/      其他独立组件
 */

// Message Display Components - 消息展示
export {
    MarkdownRenderer, MessageBubble,
    MessageList,
    ThinkingBlock,
    ToolBlock,
    TypingIndicator
} from './message';

// Input Components - 输入组件
export {
    AttachmentChips,
    AttachmentMenu, ChatInput, ChatInputField, ChatInputProps, ChatInputRef, ChatInputToolbar,
    VoiceInputButton,
    VoiceInputDialog
} from './input';

// Dialog Components - 对话框
export {
    AssistantPickerDialog, ChatSettings, ImageGenerationDialog, McpToolsDialog, ModelPickerDialog, QuickPhrasePickerDialog
} from './dialogs';

// Sidebar Components - 侧栏和头部
export {
    ChatHeader, ChatSidebar, TopicsSidebar
} from './sidebar';

// Menu Components - 菜单
export {
    MoreActionsMenu
} from './menus';

// Miscellaneous Components - 其他组件
export {
    GeneratedImageCard,
    ImageViewer,
    SearchLoadingIndicator
} from './misc';

// Background Component - 背景组件
export { ChatBackground } from './ChatBackground';
