import { useState, useCallback } from 'react';
import { generateImageWithAI, type GenerateImageOptions, type ImageGenerationResult, type Provider } from '@/services/ai/AiClient';
import { MessageRepository } from '@/storage/repositories/messages';
import { AttachmentRepository } from '@/storage/repositories/attachments';
import { ImageGenerationError } from '@/services/ai/errors';
import { File, Paths } from 'expo-file-system';
import { uuid } from '@/storage/core';

export interface UseImageGenerationOptions {
  conversationId?: string;
  provider: Provider;
  model: string;
}

export interface GenerateOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '256x256' | '512x512';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

/**
 * 图片生成自定义 Hook
 *
 * 封装图片生成的完整流程：调用 AI 服务 → 保存图片 → 创建消息 → 关联附件
 *
 * @example
 * ```typescript
 * const { generateImage, isGenerating, progress, error } = useImageGeneration({
 *   conversationId: 'xxx',
 *   provider: 'openai',
 *   model: 'dall-e-3',
 * });
 *
 * await generateImage({
 *   prompt: '一只可爱的橘猫坐在月球上',
 *   quality: 'hd',
 *   style: 'vivid',
 * });
 * ```
 */
export function useImageGeneration(options: UseImageGenerationOptions) {
  const { conversationId, provider, model } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ImageGenerationError | null>(null);

  /**
   * 生成图片
   */
  const generateImage = useCallback(async (genOptions: GenerateOptions) => {
    if (!conversationId) {
      const err = new ImageGenerationError('请先创建或选择对话', provider, model);
      setError(err);
      throw err;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {

      // 1. 调用 AI 服务生成图片
      const result = await generateImageWithAI({
        provider,
        model,
        prompt: genOptions.prompt,
        n: genOptions.n,
        size: genOptions.size,
        quality: genOptions.quality,
        style: genOptions.style,
        onCreated: () => setProgress(10),
        onProgress: (p) => setProgress(p),
        onComplete: async (imageData: ImageGenerationResult) => {
          // 2. 保存图片到本地

          const savedAttachmentIds = await saveImages(imageData.images);

          // 3. 创建消息记录

          const messageText = imageData.revisedPrompt
            ? `[图片生成]\n原提示词: ${genOptions.prompt}\nAI 优化后: ${imageData.revisedPrompt}`
            : `[图片生成]\n提示词: ${genOptions.prompt}`;

          const message = await MessageRepository.addMessage({
            conversationId,
            role: 'assistant',
            text: messageText,
            status: 'sent',
            extra: {
              type: 'image_generation',
              provider,
              model,
              prompt: genOptions.prompt,
              revisedPrompt: imageData.revisedPrompt,
              size: genOptions.size || '1024x1024',
              quality: genOptions.quality || 'standard',
              style: genOptions.style || 'vivid',
            }
          });

          // 4. 关联附件到消息

          for (const attachmentId of savedAttachmentIds) {
            await AttachmentRepository.linkToMessage(message.id, attachmentId);
          }


          setProgress(100);
        },
        onError: (err) => {
          console.error('[useImageGeneration] 图片生成失败', err);
          setError(err);
        },
      });

      return result;
    } catch (err: any) {
      console.error('[useImageGeneration] 捕获错误', err);

      const imageError = err instanceof ImageGenerationError
        ? err
        : new ImageGenerationError(err.message || '图片生成失败', provider, model, err);

      setError(imageError);
      throw imageError;
    } finally {
      setIsGenerating(false);
      // 延迟重置进度条，给用户反馈时间
      setTimeout(() => setProgress(0), 1000);
    }
  }, [conversationId, provider, model]);

  /**
   * 保存 Base64 图片到本地文件系统
   *
   * @param base64Images - Base64 编码的图片数据数组
   * @returns 保存的附件 ID 列表
   */
  const saveImages = async (base64Images: string[]): Promise<string[]> => {
    const savedAttachmentIds: string[] = [];

    for (const base64Data of base64Images) {
      try {
        // 移除 data:image/xxx;base64, 前缀（如果存在）
        const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!match) {
          console.error('[useImageGeneration] 无效的 Base64 图片数据格式', { base64Data: base64Data.substring(0, 50) });
          continue;
        }

        const imageType = match[1]; // png, jpeg, webp 等
        const pureBase64 = match[2];

        // 生成临时文件路径（使用新的 Paths API）
        const fileName = `generated_${Date.now()}_${uuid().slice(0, 8)}.${imageType}`;
        const tempFile = new File(Paths.cache, fileName);


        // 写入 Base64 数据到临时文件
        await tempFile.write(pureBase64, { encoding: 'base64' });

        // 使用 AttachmentRepository 保存附件（会自动复制到永久存储）
        const attachment = await AttachmentRepository.saveAttachmentFromUri(tempFile.uri, {
          kind: 'image',
          mime: `image/${imageType}`,
          name: fileName,
          extra: {
            source: 'ai_generated',
            model: model,
            provider: provider,
          }
        });


        savedAttachmentIds.push(attachment.id);

        // 删除临时文件（使用新的 File API）
        try {
          await tempFile.delete();
        } catch (deleteErr) {
          console.warn('[useImageGeneration] 临时文件删除失败（忽略）', deleteErr);
        }
      } catch (saveErr: any) {
        console.error('[useImageGeneration] 单张图片保存失败', saveErr);
        // 继续处理下一张图片
      }
    }

    if (savedAttachmentIds.length === 0) {
      throw new ImageGenerationError(
        '图片保存失败：无法写入文件系统',
        provider,
        model
      );
    }

    return savedAttachmentIds;
  };

  return {
    generateImage,
    isGenerating,
    progress,
    error,
  };
}
