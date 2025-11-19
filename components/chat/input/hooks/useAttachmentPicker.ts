import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { Attachment } from '@/storage/core';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { logger } from '@/utils/logger';

interface PickerFile {
  uri: string;
  mimeType?: string | null;
  mime?: string | null;
  name?: string | null;
  size?: number | null;
  type?: string;
}

export interface AttachmentPickerResult {
  selectedAttachments: Attachment[];
  pickImage: () => Promise<void>;
  pickFile: () => Promise<void>;
  removeAttachment: (id: string) => void;
  resetAttachments: () => void;
}

const log = logger.createNamespace('AttachmentPicker');

export function useAttachmentPicker(): AttachmentPickerResult {
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);

  const removeAttachment = useCallback((id: string) => {
    setSelectedAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const resetAttachments = useCallback(() => {
    setSelectedAttachments([]);
  }, []);

  const saveAttachment = useCallback(async (file: PickerFile, kind: Attachment['kind']) => {
    const mime = file.mimeType || file.mime || null;
    const att = await AttachmentRepository.saveAttachmentFromUri(file.uri, {
      kind,
      mime,
      name: file.name || (kind === 'image' ? 'image' : 'file'),
      size: file.size || null,
    });
    setSelectedAttachments((prev) => [...prev, att]);
  }, []);

  const parsePickerResult = (result: DocumentPicker.DocumentPickerResult): PickerFile | null => {
    if ('canceled' in result && result.canceled) return null;
    if ('type' in result && result.type === 'cancel') return null;

    const file = 'assets' in result ? result.assets?.[0] : result;
    if (!file || !file.uri) return null;

    return file as PickerFile;
  };

  const pickImage = useCallback(async () => {
    try {
      const result = (await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: false,
      })) as DocumentPicker.DocumentPickerResult;
      const file = parsePickerResult(result);
      if (!file) return;
      await saveAttachment(file, 'image');
    } catch (error) {
      log.warn('选择图片失败', error);
    }
  }, [saveAttachment]);

  const pickFile = useCallback(async () => {
    try {
      const result = (await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
      })) as DocumentPicker.DocumentPickerResult;
      const file = parsePickerResult(result);
      if (!file) return;
      await saveAttachment(file, 'file');
    } catch (error) {
      log.warn('选择文件失败', error);
    }
  }, [saveAttachment]);

  return {
    selectedAttachments,
    pickImage,
    pickFile,
    removeAttachment,
    resetAttachments,
  };
}
