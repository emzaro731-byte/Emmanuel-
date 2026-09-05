import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    const FAL_KEY = Deno.env.get("FAL_KEY");
    const FAL_VIDEO_MODEL = Deno.env.get("FAL_VIDEO_MODEL");

    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
    }

    if (!FAL_VIDEO_MODEL) {
      throw new Error("FAL_VIDEO_MODEL is not configured");
    }

    const body = await req.json();

    const prompt = String(body.prompt || "");
    const imageUrl = body.image_url || null;

    if (!prompt && !imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt or image_url is required"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const input: Record<string, unknown> = {};

    if (prompt) {
      input.prompt = prompt;
    }

    if (imageUrl) {
      input.image_url = imageUrl;
    }

    const response = await fetch(
      `https://fal.run/${FAL_VIDEO_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.detail || "Video generation failed",
          data
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error
          ? error.message
          : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});