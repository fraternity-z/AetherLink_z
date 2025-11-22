import { useState, useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import { logger } from '@/utils/logger';
import {
  createExportService,
  ExportOptions,
  ExportResult,
  ExportProgress,
} from '@/services/export';

/**
 * 导出状态
 */
export type ExportState = 'idle' | 'exporting' | 'success' | 'error';

/**
 * use-topic-export Hook
 *
 * 封装话题导出逻辑，提供给 UI 组件使用
 */
export function useTopicExport() {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  /**
   * 导出话题
   *
   * @param conversationId 话题 ID
   * @param options 导出选项
   */
  const exportTopic = useCallback(async (
    conversationId: string,
    options?: Partial<ExportOptions>
  ) => {
    try {
      setState('exporting');
      setProgress(null);
      setError(null);
      setResult(null);

      logger.info('useTopicExport: Starting export', { conversationId, options });

      // 创建导出服务
      const service = createExportService(conversationId, options)
        .onProgress((p) => {
          setProgress(p);
        });

      // 执行导出
      const exportResult = await service.exportToDocx();
      setResult(exportResult);
      setState('success');

      logger.info('useTopicExport: Export completed', exportResult);

      return exportResult;
    } catch (err: any) {
      const errorMessage = err?.message || '导出失败';
      setError(errorMessage);
      setState('error');

      logger.error('useTopicExport: Export failed', err);

      throw err;
    }
  }, []);

  /**
   * 分享导出的文件
   *
   * @param filePath 文件路径
   */
  const shareFile = useCallback(async (filePath: string) => {
    try {
      logger.info('useTopicExport: Sharing file', { filePath });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('文件分享功能不可用');
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: '分享导出的话题',
      });

      logger.info('useTopicExport: File shared successfully');
    } catch (err: any) {
      const errorMessage = err?.message || '分享失败';
      logger.error('useTopicExport: Sharing failed', err);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * 导出并分享（一键操作）
   *
   * @param conversationId 话题 ID
   * @param options 导出选项
   */
  const exportAndShare = useCallback(async (
    conversationId: string,
    options?: Partial<ExportOptions>
  ) => {
    const exportResult = await exportTopic(conversationId, options);
    await shareFile(exportResult.filePath);
  }, [exportTopic, shareFile]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState('idle');
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  return {
    // 状态
    state,
    progress,
    error,
    result,

    // 操作
    exportTopic,
    shareFile,
    exportAndShare,
    reset,

    // 便捷判断
    isExporting: state === 'exporting',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
  };
}
