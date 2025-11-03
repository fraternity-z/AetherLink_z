import { SettingsRepository, SettingKey } from '@/storage/repositories/settings';
import { MessageRepository } from '@/storage/repositories/messages';
import { ChatRepository } from '@/storage/repositories/chat';
import { streamCompletion, type Provider } from '@/services/ai/AiClient';
import type { CoreMessage } from 'ai';

function sanitizeTitle(input: string): string {
  let t = (input || '').trim();
  t = t.replace(/^"|"$/g, '');
  t = t.replace(/[\n\r]+/g, ' ');
  t = t.replace(/[。！？!?,，…\-:;；]/g, '');
  if (t.length > 30) t = t.slice(0, 30);
  if (!t) t = '新话题';
  return t;
}

export async function autoNameConversation(conversationId: string): Promise<void> {
  const sr = SettingsRepository();
  const enabled = (await sr.get<boolean>(SettingKey.TopicAutoNameEnabled)) ?? true;
  if (!enabled) return;

  const provider = ((await sr.get<string>(SettingKey.TopicNamingProvider)) ?? (await sr.get<string>(SettingKey.DefaultProvider)) ?? 'openai') as Provider;
  const model = (await sr.get<string>(SettingKey.TopicNamingModel)) ?? (await sr.get<string>(SettingKey.DefaultModel)) ?? (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gemini-1.5-flash');
  const prompt = (await sr.get<string>(SettingKey.TopicAutoNamePrompt)) ?? '请用简短中文（不超过20字）给这段对话生成一个标题，仅输出标题本身。';

  const msgsDb = await MessageRepository.listMessages(conversationId, { limit: 8 });
  // 取前两条（首轮对话），若不足则用已有
  const firstTurn = msgsDb.slice(0, 2);

  const sys: CoreMessage = { role: 'system', content: prompt };
  const history: CoreMessage[] = firstTurn.map((m) => ({ role: m.role, content: m.text ?? '' }));

  let acc = '';
  try {
    await streamCompletion({
      provider,
      model,
      messages: [sys, ...history],
      temperature: 0.5,
      maxTokens: 64,
      onToken: (d) => { acc += d; },
      onDone: async () => {
        const title = sanitizeTitle(acc);
        await ChatRepository.renameConversation(conversationId, title);
      },
      onError: (e) => {
        console.warn('[TopicNaming] summarize failed', e);
      },
    });
  } catch (e) {
    console.warn('[TopicNaming] fatal error', e);
  }
}
