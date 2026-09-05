import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL =
  Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `
You are Destiny AI, a powerful, helpful, intelligent AI assistant.

Your goals:
- Give accurate and useful answers.
- Understand the user's conversation context.
- Explain difficult subjects clearly.
- Help with programming, mathematics, science, writing, business,
  education, technology and creative tasks.
- When writing code, provide complete, practical code and explain
  important implementation details when useful.
- Never claim to have performed an action that you did not actually perform.
- Never invent sources, facts, links, or capabilities.
- If information may be outdated or uncertain, clearly say so.
- Be concise for simple questions and detailed for complex questions.
- Use Markdown when it improves readability.
- Use headings, bullets, numbered steps, tables and code blocks when useful.
- Preserve important context from previous messages.
- Do not unnecessarily repeat the user's question.
- Be friendly, professional and natural.

You are Destiny AI, not ChatGPT.
Do not claim to be OpenAI or ChatGPT.

When the user asks for something you cannot actually do,
explain the limitation honestly and provide the closest useful alternative.
`;

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Only POST requests are supported.",
      },
      405,
    );
  }

  if (!GROQ_API_KEY) {
    return jsonResponse(
      {
        error:
          "GROQ_API_KEY is not configured in Supabase Function Secrets.",
      },
      500,
    );
  }

  try {
    const body = await req.json();

    /*
      Supported request format:

      {
        "messages": [
          {
            "role": "user",
            "content": "Hello"
          }
        ],
        "model": "openai/gpt-oss-120b",
        "temperature": 0.7,
        "max_tokens": 8192
      }

      The frontend can also send:
      {
        "message": "Hello"
      }

      and the function will convert it into a chat message.
    */

    let messages = Array.isArray(body?.messages)
      ? body.messages
      : [];

    // Support simple { message: "..." } requests
    if (
      messages.length === 0 &&
      typeof body?.message === "string" &&
      body.message.trim()
    ) {
      messages = [
        {
          role: "user",
          content: body.message.trim(),
        },
      ];
    }

    if (messages.length === 0) {
      return jsonResponse(
        {
          error: "No messages were provided.",
        },
        400,
      );
    }

    /*
      Sanitize incoming messages.

      We allow:
      system
      user
      assistant

      but Destiny AI's own system prompt remains controlled
      by this Edge Function.
    */

    const cleanMessages = messages
      .filter(
        (message: any) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string",
      )
      .map((message: any) => ({
        role: message.role,
        content: message.content,
      }));

    if (cleanMessages.length === 0) {
      return jsonResponse(
        {
          error: "No valid messages were provided.",
        },
        400,
      );
    }

    /*
      Prevent extremely large requests from accidentally
      consuming the entire context window.
    */

    const MAX_MESSAGES = 80;

    const recentMessages =
      cleanMessages.length > MAX_MESSAGES
        ? cleanMessages.slice(-MAX_MESSAGES)
        : cleanMessages;

    const selectedModel =
      typeof body?.model === "string" && body.model.trim()
        ? body.model.trim()
        : GROQ_MODEL;

    const temperature =
      typeof body?.temperature === "number"
        ? Math.min(Math.max(body.temperature, 0), 2)
        : 0.7;

    const maxTokens =
      typeof body?.max_tokens === "number"
        ? Math.min(Math.max(body.max_tokens, 256), 16384)
        : 8192;

    /*
      GPT-OSS supports reasoning controls.
      Default to medium so Destiny AI can handle
      difficult questions without unnecessarily
      increasing reasoning for every simple request.
    */

    const reasoningEffort =
      body?.reasoning_effort === "low" ||
      body?.reasoning_effort === "medium" ||
      body?.reasoning_effort === "high"
        ? body.reasoning_effort
        : "medium";

    const groqMessages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...recentMessages,
    ];

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },

        body: JSON.stringify({
          model: selectedModel,
          messages: groqMessages,

          temperature,

          max_tokens: maxTokens,

          reasoning_effort: reasoningEffort,

          stream: false,
        }),
      },
    );

    const responseText = await groqResponse.text();

    let groqData: any;

    try {
      groqData = JSON.parse(responseText);
    } catch {
      groqData = {
        error: {
          message: responseText,
        },
      };
    }

    if (!groqResponse.ok) {
      console.error(
        "Groq API error:",
        groqResponse.status,
        groqData,
      );

      return jsonResponse(
        {
          error:
            groqData?.error?.message ||
            `Groq API returned HTTP ${groqResponse.status}.`,
          status: groqResponse.status,
        },
        groqResponse.status,
      );
    }

    const assistantMessage =
      groqData?.choices?.[0]?.message?.content ?? "";

    if (!assistantMessage) {
      return jsonResponse(
        {
          error: "The AI returned an empty response.",
        },
        502,
      );
    }

    /*
      Return a clean response that the React Native
      application can easily consume.
    */

    return jsonResponse({
      success: true,

      message: assistantMessage,

      model:
        groqData?.model ||
        selectedModel,

      usage: groqData?.usage || null,

      finish_reason:
        groqData?.choices?.[0]?.finish_reason ||
        null,
    });
  } catch (error) {
    console.error("Destiny AI function error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});