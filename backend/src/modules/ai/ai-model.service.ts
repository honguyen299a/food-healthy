import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { resultSchema } from './ai-contract';

export type ModelMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
export function ollamaTimeoutMs() {
  const value = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);
  return Number.isFinite(value) ? Math.min(180000, Math.max(5000, value)) : 120000;
}
@Injectable()
export class AiModelService {
  async complete(messages: ModelMessage[]) {
    try {
      const response = await fetch(
        `${(process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(ollamaTimeoutMs()),
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'qwen3:4b-instruct',
            messages,
            format: resultSchema,
            stream: false,
            think: false,
            options: { temperature: 0, num_ctx: 8192, num_predict: 1800 },
          }),
        },
      );
      if (!response.ok) throw new Error('Ollama HTTP error');
      const body = (await response.json()) as any;
      if (typeof body.message?.content !== 'string' || body.message.content.length > 24000)
        throw new Error('Invalid response');
      return body.message.content as string;
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
        throw new ServiceUnavailableException(
          'AI xử lý quá thời gian chờ. Hãy thử yêu cầu ngắn hơn hoặc chỉ thay đổi một bữa.',
        );
      throw new ServiceUnavailableException(
        'Không nhận được phản hồi từ Ollama. Kiểm tra Ollama đang chạy và đã tải đúng model; sau đó thử lại.',
      );
    }
  }
}
