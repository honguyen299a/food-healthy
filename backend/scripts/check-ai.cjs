require("dotenv/config");
const { parseResult, resultSchema } = require("../dist/modules/ai/ai-contract");
const base = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(
  /\/$/,
  "",
);
const model = process.env.OLLAMA_MODEL || "qwen3:4b-instruct";
async function call(extra) {
  const response = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      options: { temperature: 0, num_ctx: 4096, num_predict: 400 },
      ...extra,
    }),
  });
  if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
  return response.json();
}
(async () => {
  const report = { model, schemaOutput: false, toolCalling: false };
  try {
    const body = await call({
      format: resultSchema,
      messages: [
        {
          role: "user",
          content: 'Return JSON with kind ADVICE, reply "Xin chào", items [].',
        },
      ],
    });
    const value = parseResult(body.message.content);
    report.schemaOutput = value.kind === "ADVICE" && value.items.length === 0;
  } catch (e) {
    report.schemaError = e.message;
  }
  try {
    const body = await call({
      messages: [
        {
          role: "user",
          content:
            "Call get_nutrition_target with no arguments. Do not answer with text.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_nutrition_target",
            description: "Get current nutrition target",
            parameters: { type: "object", properties: {}, required: [] },
          },
        },
      ],
    });
    report.toolCalling =
      body.message?.tool_calls?.some(
        (x) =>
          x.function?.name === "get_nutrition_target" &&
          x.function.arguments &&
          Object.keys(x.function.arguments).length === 0,
      ) || false;
  } catch (e) {
    report.toolError = e.message;
  }
  console.log(JSON.stringify(report, null, 2));
  // The assistant uses validated schema output, not native model tool calls.
  if (!report.schemaOutput) process.exitCode = 1;
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
