import { useCallback, useState } from 'react';

export interface ChatDialogState {
  attachmentMenuVisible: boolean;
  openAttachmentMenu: () => void;
  closeAttachmentMenu: () => void;
  moreActionsMenuVisible: boolean;
  openMoreActionsMenu: () => void;
  closeMoreActionsMenu: () => void;
  imageDialogVisible: boolean;
  openImageDialog: () => void;
  closeImageDialog: () => void;
  mcpDialogVisible: boolean;
  openMcpDialog: () => void;
  closeMcpDialog: () => void;
  phrasePickerVisible: boolean;
  openPhrasePicker: () => void;
  closePhrasePicker: () => void;
}

export function useChatDialogs(): ChatDialogState {
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [moreActionsMenuVisible, setMoreActionsMenuVisible] = useState(false);
  const [imageDialogVisible, setImageDialogVisible] = useState(false);
  const [mcpDialogVisible, setMcpDialogVisible] = useState(false);
  const [phrasePickerVisible, setPhrasePickerVisible] = useState(false);

  const openAttachmentMenu = useCallback(() => setAttachmentMenuVisible(true), []);
  const closeAttachmentMenu = useCallback(() => setAttachmentMenuVisible(false), []);

  const openMoreActionsMenu = useCallback(() => setMoreActionsMenuVisible(true), []);
  const closeMoreActionsMenu = useCallback(() => setMoreActionsMenuVisible(false), []);

  const openImageDialog = useCallback(() => setImageDialogVisible(true), []);
  const closeImageDialog = useCallback(() => setImageDialogVisible(false), []);

  const openMcpDialog = useCallback(() => setMcpDialogVisible(true), []);
  const closeMcpDialog = useCallback(() => setMcpDialogVisible(false), []);

  const openPhrasePicker = useCallback(() => setPhrasePickerVisible(true), []);
  const closePhrasePicker = useCallback(() => setPhrasePickerVisible(false), []);

  return {
    attachmentMenuVisible,
    openAttachmentMenu,
    closeAttachmentMenu,
    moreActionsMenuVisible,
    openMoreActionsMenu,
    closeMoreActionsMenu,
    imageDialogVisible,
    openImageDialog,
    closeImageDialog,
    mcpDialogVisible,
    openMcpDialog,
    closeMcpDialog,
    phrasePickerVisible,
    openPhrasePicker,
    closePhrasePicker,
  };
}
