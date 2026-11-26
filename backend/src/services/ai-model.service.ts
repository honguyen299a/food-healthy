import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { resultSchema } from "../ai-contract";

export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
@Injectable()
export class AiModelService {
  async complete(messages: ModelMessage[]) {
    try {
      const response = await fetch(
        `${(process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "")}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || "qwen3:4b-instruct",
            messages,
            format: resultSchema,
            stream: false,
            think: false,
            options: { temperature: 0, num_ctx: 8192, num_predict: 1800 },
          }),
        },
      );
      if (!response.ok) throw new Error("Ollama HTTP error");
      const body = (await response.json()) as any;
      if (
        typeof body.message?.content !== "string" ||
        body.message.content.length > 24000
      )
        throw new Error("Invalid response");
      return body.message.content as string;
    } catch {
      throw new ServiceUnavailableException(
        "Không nhận được phản hồi từ Ollama. Kiểm tra Ollama đang chạy và đã tải đúng model; sau đó thử lại.",
      );
    }
  }
}
