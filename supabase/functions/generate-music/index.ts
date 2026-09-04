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
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    const body = await req.json();

    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return jsonResponse(
        {
          success: false,
          error: "Please provide a music prompt.",
        },
        400,
      );
    }

    const FAL_KEY = Deno.env.get("FAL_KEY");

    if (!FAL_KEY) {
      return jsonResponse(
        {
          success: false,
          error: "FAL_KEY is missing.",
        },
        500,
      );
    }

    /*
      Set your selected music/audio model in Supabase:

      FAL_MUSIC_MODEL
    */

    const MUSIC_MODEL =
      Deno.env.get("FAL_MUSIC_MODEL");

    if (!MUSIC_MODEL) {
      return jsonResponse(
        {
          success: false,

          error:
            "FAL_MUSIC_MODEL is not configured in Supabase Secrets.",
        },
        500,
      );
    }

    const falResponse = await fetch(
      `https://fal.run/${MUSIC_MODEL}`,
      {
        method: "POST",

        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      },
    );

    const falData = await falResponse.json();

    if (!falResponse.ok) {
      console.error("fal.ai music error:", falData);

      return jsonResponse(
        {
          success: false,

          error:
            falData?.detail ||
            falData?.error ||
            "Music generation failed.",
        },
        falResponse.status,
      );
    }

    const audioUrl =
      falData?.audio?.url ||
      falData?.audio_url ||
      falData?.url;

    return jsonResponse({
      success: true,

      type: "music",

      audio_url: audioUrl || null,

      data: falData,
    });
  } catch (error) {
    console.error("Generate music error:", error);

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