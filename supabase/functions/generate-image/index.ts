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

    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return jsonResponse(
        {
          success: false,
          error: "Please provide an image prompt.",
        },
        400,
      );
    }

    const FAL_KEY = Deno.env.get("FAL_KEY");

    if (!FAL_KEY) {
      return jsonResponse(
        {
          success: false,
          error: "FAL_KEY is not configured.",
        },
        500,
      );
    }

    // Change this secret if you want to use another fal.ai image model.
    const IMAGE_MODEL =
      Deno.env.get("FAL_IMAGE_MODEL") ||
      "fal-ai/flux/schnell";

    const falResponse = await fetch(
      `https://fal.run/${IMAGE_MODEL}`,
      {
        method: "POST",

        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt: prompt.trim(),

          image_size: "square_hd",

          num_images: 1,
        }),
      },
    );

    const falData = await falResponse.json();

    if (!falResponse.ok) {
      console.error("fal.ai image error:", falData);

      return jsonResponse(
        {
          success: false,

          error:
            falData?.detail ||
            falData?.error ||
            "Image generation failed.",
        },
        falResponse.status,
      );
    }

    const imageUrl =
      falData?.images?.[0]?.url ||
      falData?.image?.url ||
      falData?.url;

    if (!imageUrl) {
      console.error("Unexpected fal.ai response:", falData);

      return jsonResponse(
        {
          success: false,
          error: "Image was generated but no image URL was found.",
          data: falData,
        },
        500,
      );
    }

    return jsonResponse({
      success: true,

      type: "image",

      image_url: imageUrl,

      data: falData,
    });
  } catch (error) {
    console.error("Generate image error:", error);

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