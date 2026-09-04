const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL =
  "llama-3.3-70b-versatile";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "POST request required",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const groqKey =
      Deno.env.get("GROQ_API_KEY");

    if (!groqKey) {
      return new Response(
        JSON.stringify({
          error:
            "GROQ_API_KEY is not configured.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const requestedModel =
      typeof body.model === "string"
        ? body.model
        : "Destiny AI";

    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Message is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const systemPrompt = `
You are Destiny AI, a powerful, helpful and professional
AI assistant.

Your responsibilities include:
- answering questions
- explaining difficult subjects
- helping with programming
- writing and rewriting
- brainstorming
- research assistance
- mathematics
- science
- business
- creative work

Be accurate, clear and helpful.

The selected application mode is:
${requestedModel}

Do not claim to have performed an action that you did not perform.
`;

    const groqResponse = await fetch(
      GROQ_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    const groqData =
      await groqResponse.json();

    if (!groqResponse.ok) {
      console.error(
        "Groq error:",
        groqData
      );

      return new Response(
        JSON.stringify({
          error:
            groqData?.error?.message ||
            "Groq request failed.",
        }),
        {
          status: groqResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const reply =
      groqData?.choices?.[0]?.message
        ?.content;

    if (!reply) {
      return new Response(
        JSON.stringify({
          error:
            "The AI returned an empty response.",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply,
        model: DEFAULT_MODEL,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Destiny AI error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});