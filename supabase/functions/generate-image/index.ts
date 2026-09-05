import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  // ----------------------------------------
  // CORS
  // ----------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ----------------------------------------
  // Only POST allowed
  // ----------------------------------------
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Only POST requests are allowed",
      },
      405,
    );
  }

  try {
    // ----------------------------------------
    // Check FAL key
    // ----------------------------------------
    const FAL_KEY = Deno.env.get("FAL_KEY");

    if (!FAL_KEY) {
      console.error("FAL_KEY is missing");

      return jsonResponse(
        {
          success: false,
          error: "FAL_KEY is not configured in Supabase Secrets",
        },
        500,
      );
    }

    // ----------------------------------------
    // Read request body safely
    // ----------------------------------------
    const rawBody = await req.text();

    console.log("Request body length:", rawBody.length);

    if (!rawBody.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Request body is empty",
        },
        400,
      );
    }

    // ----------------------------------------
    // Parse JSON safely
    // ----------------------------------------
    let body: {
      prompt?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("REQUEST JSON PARSE ERROR:", parseError);
      console.error("RAW BODY:", rawBody);

      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        400,
      );
    }

    // ----------------------------------------
    // Validate prompt
    // ----------------------------------------
    const prompt = body?.prompt;

    if (
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return jsonResponse(
        {
          success: false,
          error: "A valid image prompt is required",
        },
        400,
      );
    }

    console.log(
      "Generating image with prompt:",
      prompt,
    );

    // ----------------------------------------
    // Call FAL
    // ----------------------------------------
    const falResponse = await fetch(
      "https://fal.run/fal-ai/flux/dev",
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
          enable_safety_checker: true,
          output_format: "png",
        }),
      },
    );

    // ----------------------------------------
    // Read FAL response safely
    // ----------------------------------------
    const falRaw = await falResponse.text();

    console.log(
      "FAL status:",
      falResponse.status,
    );

    console.log(
      "FAL response length:",
      falRaw.length,
    );

    if (!falRaw.trim()) {
      console.error(
        "FAL returned an empty response",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Image provider returned an empty response",
          provider_status: falResponse.status,
        },
        502,
      );
    }

    // ----------------------------------------
    // Parse FAL JSON safely
    // ----------------------------------------
    let data: any;

    try {
      data = JSON.parse(falRaw);
    } catch (parseError) {
      console.error(
        "FAL JSON PARSE ERROR:",
        parseError,
      );

      console.error(
        "FAL RAW RESPONSE:",
        falRaw,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Image provider returned invalid JSON",
          provider_status: falResponse.status,
          provider_response: falRaw.slice(
            0,
            1000,
          ),
        },
        502,
      );
    }

    // ----------------------------------------
    // FAL returned an error
    // ----------------------------------------
    if (!falResponse.ok) {
      console.error(
        "FAL IMAGE ERROR:",
        data,
      );

      const providerError =
        data?.detail ||
        data?.error ||
        data?.message ||
        "Image generation failed";

      return jsonResponse(
        {
          success: false,
          error: providerError,
          provider_status: falResponse.status,
        },
        falResponse.status >= 400 &&
        falResponse.status <= 599
          ? falResponse.status
          : 502,
      );
    }

    // ----------------------------------------
    // Extract image URL
    // ----------------------------------------
    const imageUrl =
      data?.images?.[0]?.url ??
      data?.image?.url ??
      data?.output?.images?.[0]?.url ??
      null;

    if (!imageUrl) {
      console.error(
        "No image URL found in FAL response:",
        data,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Image was generated but no image URL was returned",
          data,
        },
        502,
      );
    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------
    console.log(
      "Image generated successfully",
    );

    return jsonResponse({
      success: true,
      image_url: imageUrl,
      image: imageUrl,
    });
  } catch (error) {
    console.error(
      "GENERATE IMAGE ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});