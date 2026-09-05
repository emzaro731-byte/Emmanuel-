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
    const FAL_MUSIC_MODEL = Deno.env.get("FAL_MUSIC_MODEL");

    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
    }

    if (!FAL_MUSIC_MODEL) {
      throw new Error("FAL_MUSIC_MODEL is not configured");
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt is required"
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

    const response = await fetch(
      `https://fal.run/${FAL_MUSIC_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt
        })
      }
    );

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: response.ok,
        data
      }),
      {
        status: response.ok ? 200 : response.status,
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