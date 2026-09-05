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

    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured");
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
      "https://fal.run/fal-ai/flux/dev",
      {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          image_size: "square_hd",
          num_images: 1,
          enable_safety_checker: true,
          output_format: "png"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.detail || "Image generation failed"
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

    const imageUrl = data?.images?.[0]?.url;

    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
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