import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed. Use POST.",
      },
      405,
    );
  }

  try {
    const body = await req.json();

    const message = body?.message;

    if (!message || typeof message !== "string") {
      return jsonResponse(
        {
          success: false,
          error: "Please provide a valid message.",
        },
        400,
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing.");

      return jsonResponse(
        {
          success: false,
          error: "Server configuration error.",
        },
        500,
      );
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",

              content: `
You are Destiny AI.

You are an intelligent, helpful, friendly and professional AI assistant.

Your abilities include:

- Answering questions
- Programming and coding
- Writing
- Education
- Mathematics
- Science
- Technology
- Business ideas
- Creative ideas

Give clear, accurate and useful answers.

If you do not know something, be honest.

Always be helpful and respectful.
              `.trim(),
            },

            {
              role: "user",
              content: message.trim(),
            },
          ],

          temperature: 0.7,

          max_completion_tokens: 1500,
        }),
      },
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", groqData);

      return jsonResponse(
        {
          success: false,

          error:
            groqData?.error?.message ||
            "Groq AI failed to generate a response.",
        },
        groqResponse.status,
      );
    }

    const reply =
      groqData?.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return jsonResponse({
      success: true,

      reply,
    });
  } catch (error) {
    console.error("Destiny AI error:", error);

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      500,
    );
  }
});