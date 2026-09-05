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
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

Deno.serve(async (req: Request) => {
  // -----------------------------------------
  // CORS
  // -----------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // -----------------------------------------
  // POST ONLY
  // -----------------------------------------
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
    // -----------------------------------------
    // ENVIRONMENT VARIABLES
    // -----------------------------------------
    const FAL_KEY = Deno.env.get("FAL_KEY");
    const FAL_VIDEO_MODEL =
      Deno.env.get("FAL_VIDEO_MODEL");

    if (!FAL_KEY) {
      console.error("FAL_KEY is missing");

      return jsonResponse(
        {
          success: false,
          error:
            "FAL_KEY is not configured in Supabase Secrets",
        },
        500,
      );
    }

    if (!FAL_VIDEO_MODEL) {
      console.error(
        "FAL_VIDEO_MODEL is missing",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "FAL_VIDEO_MODEL is not configured in Supabase Secrets",
        },
        500,
      );
    }

    console.log(
      "Video model:",
      FAL_VIDEO_MODEL,
    );

    // -----------------------------------------
    // READ REQUEST BODY SAFELY
    // -----------------------------------------
    const rawBody = await req.text();

    console.log(
      "Request body length:",
      rawBody.length,
    );

    if (!rawBody.trim()) {
      return jsonResponse(
        {
          success: false,
          error: "Request body is empty",
        },
        400,
      );
    }

    // -----------------------------------------
    // PARSE REQUEST JSON SAFELY
    // -----------------------------------------
    let body: {
      prompt?: string;
      image_url?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error(
        "REQUEST JSON PARSE ERROR:",
        error,
      );

      console.error(
        "RAW REQUEST BODY:",
        rawBody,
      );

      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        400,
      );
    }

    // -----------------------------------------
    // GET INPUTS
    // -----------------------------------------
    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    const imageUrl =
      typeof body?.image_url === "string"
        ? body.image_url.trim()
        : "";

    // -----------------------------------------
    // VALIDATE INPUT
    // -----------------------------------------
    if (!prompt && !imageUrl) {
      return jsonResponse(
        {
          success: false,
          error:
            "A prompt or image_url is required",
        },
        400,
      );
    }

    // -----------------------------------------
    // BUILD FAL INPUT
    // -----------------------------------------
    const input: Record<string, unknown> = {};

    if (prompt) {
      input.prompt = prompt;
    }

    if (imageUrl) {
      input.image_url = imageUrl;
    }

    console.log(
      "Sending video request to FAL",
    );

    // -----------------------------------------
    // CALL FAL
    // -----------------------------------------
    const response = await fetch(
      `https://fal.run/${FAL_VIDEO_MODEL}`,
      {
        method: "POST",

        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(input),
      },
    );

    // -----------------------------------------
    // READ RESPONSE SAFELY
    // -----------------------------------------
    const rawResponse =
      await response.text();

    console.log(
      "FAL response status:",
      response.status,
    );

    console.log(
      "FAL response length:",
      rawResponse.length,
    );

    // -----------------------------------------
    // EMPTY FAL RESPONSE
    // -----------------------------------------
    if (!rawResponse.trim()) {
      console.error(
        "FAL returned an empty response",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Video provider returned an empty response",
          provider_status: response.status,
        },
        502,
      );
    }

    // -----------------------------------------
    // PARSE FAL JSON SAFELY
    // -----------------------------------------
    let data: any;

    try {
      data = JSON.parse(rawResponse);
    } catch (error) {
      console.error(
        "FAL JSON PARSE ERROR:",
        error,
      );

      console.error(
        "FAL RAW RESPONSE:",
        rawResponse,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Video provider returned invalid JSON",
          provider_status: response.status,
          provider_response:
            rawResponse.slice(0, 2000),
        },
        502,
      );
    }

    // -----------------------------------------
    // FAL ERROR
    // -----------------------------------------
    if (!response.ok) {
      console.error(
        "FAL VIDEO ERROR:",
        data,
      );

      const providerError =
        data?.detail ||
        data?.error ||
        data?.message ||
        "Video generation failed";

      return jsonResponse(
        {
          success: false,
          error: providerError,
          provider_status:
            response.status,
          data,
        },
        response.status >= 400 &&
        response.status <= 599
          ? response.status
          : 502,
      );
    }

    // -----------------------------------------
    // FIND VIDEO URL
    // -----------------------------------------
    const videoUrl =
      data?.video?.url ??
      data?.video_url ??
      data?.output?.video?.url ??
      data?.output?.video_url ??
      null;

    // -----------------------------------------
    // NO VIDEO URL
    // -----------------------------------------
    if (!videoUrl) {
      console.error(
        "No video URL found:",
        data,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Video generation completed but no video URL was returned",
          data,
        },
        502,
      );
    }

    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------
    console.log(
      "Video generated successfully",
    );

    return jsonResponse({
      success: true,
      video_url: videoUrl,
      video: videoUrl,
      data,
    });
  } catch (error) {
    console.error(
      "GENERATE VIDEO ERROR:",
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