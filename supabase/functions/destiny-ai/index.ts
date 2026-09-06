import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `
You are Destiny AI, a powerful, helpful and intelligent AI assistant powered by Groq.

Goals:
- Give accurate, useful and natural answers.
- Understand conversation context and any supplied memory/project context.
- Help with programming, mathematics, science, writing, business, education, technology and creative tasks.
- Provide complete practical code when requested.
- Never claim to have performed an action you did not perform.
- Never invent sources, facts, links or capabilities.
- If information may be outdated or uncertain, say so clearly.
- Be concise for simple questions and detailed for complex questions.
- Use Markdown, headings, bullets, tables and code blocks when useful.
- You are Destiny AI, not ChatGPT. Do not claim to be OpenAI or ChatGPT.
`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function text(value: unknown, max = 12000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Only POST requests are supported." }, 405);
  if (!GROQ_API_KEY) {
    return jsonResponse({ error: "GROQ_API_KEY is not configured in Supabase Function Secrets." }, 500);
  }

  try {
    const body = await req.json();
    let messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0 && typeof body?.message === "string" && body.message.trim()) {
      messages = [{ role: "user", content: body.message.trim() }];
    }

    if (messages.length === 0) return jsonResponse({ error: "No messages were provided." }, 400);

    const cleanMessages = messages
      .filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 24000) }));

    if (cleanMessages.length === 0) return jsonResponse({ error: "No valid messages were provided." }, 400);

    const recentMessages = cleanMessages.slice(-80);
    const mode = text(body?.mode, 80) || "General";
    const project = text(body?.project, 200);
    const memory = text(body?.memory, 6000);
    const context = text(body?.context, 10000);

    const contextParts = [
      `Current assistant mode: ${mode}`,
      project ? `Current project: ${project}` : "",
      memory ? `User memory/context (use only when relevant):\n${memory}` : "",
      context ? `Additional trusted app context:\n${context}` : "",
    ].filter(Boolean);

    const systemContent = [SYSTEM_PROMPT, ...contextParts].join("\n\n");

    const selectedModel = text(body?.model, 120) || GROQ_MODEL;
    const temperature = typeof body?.temperature === "number"
      ? Math.min(Math.max(body.temperature, 0), 2)
      : 0.7;
    const maxTokens = typeof body?.max_tokens === "number"
      ? Math.min(Math.max(body.max_tokens, 256), 16384)
      : 8192;
    const reasoningEffort = ["low", "medium", "high"].includes(body?.reasoning_effort)
      ? body.reasoning_effort
      : "medium";

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: systemContent }, ...recentMessages],
        temperature,
        max_tokens: maxTokens,
        reasoning_effort: reasoningEffort,
        stream: false,
      }),
    });

    const responseText = await groqResponse.text();
    let groqData: any;
    try {
      groqData = JSON.parse(responseText);
    } catch {
      groqData = { error: { message: responseText } };
    }

    if (!groqResponse.ok) {
      console.error("Groq API error:", groqResponse.status, groqData);
      return jsonResponse({
        error: groqData?.error?.message || `Groq API returned HTTP ${groqResponse.status}.`,
        status: groqResponse.status,
      }, groqResponse.status);
    }

    const assistantMessage = groqData?.choices?.[0]?.message?.content ?? "";
    if (!assistantMessage) return jsonResponse({ error: "The AI returned an empty response." }, 502);

    return jsonResponse({
      success: true,
      message: assistantMessage,
      model: groqData?.model || selectedModel,
      mode,
      project: project || null,
      usage: groqData?.usage || null,
      finish_reason: groqData?.choices?.[0]?.finish_reason || null,
    });
  } catch (error) {
    console.error("Destiny AI function error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, 500);
  }
});