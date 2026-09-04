import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
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

    const body = await req.json();

    const message = body?.message;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          error: "Please provide a message.",
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

    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY is not configured on the server.",
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

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content:
                "You are Destiny AI, a helpful, intelligent, friendly AI assistant. Give clear and useful answers.",
            },
            {
              role: "user",
              content: message,
            },
          ],

          temperature: 0.7,
          max_completion_tokens: 1024,
        }),
      }
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq error:", groqData);

      return new Response(
        JSON.stringify({
          error:
            groqData?.error?.message ||
            "Groq AI request failed.",
        }),
        {
          status: groqResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const reply =
      groqData?.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return new Response(
      JSON.stringify({
        success: true,
        reply,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Destiny AI error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
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
});