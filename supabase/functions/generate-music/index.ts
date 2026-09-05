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
    // ENVIRONMENT
    // -----------------------------------------
    const FAL_KEY = Deno.env.get("FAL_KEY");
    const FAL_MUSIC_MODEL =
      Deno.env.get("FAL_MUSIC_MODEL");

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

    if (!FAL_MUSIC_MODEL) {
      console.error(
        "FAL_MUSIC_MODEL is missing",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "FAL_MUSIC_MODEL is not configured in Supabase Secrets",
        },
        500,
      );
    }

    console.log(
      "Music model:",
      FAL_MUSIC_MODEL,
    );

    // -----------------------------------------
    // READ REQUEST BODY
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
    // PARSE REQUEST JSON
    // -----------------------------------------
    let body: {
      prompt?: string;
      duration?: number;
    };

    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error(
        "REQUEST JSON PARSE ERROR:",
        error,
      );

      console.error(
        "RAW BODY:",
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
    // PROMPT
    // -----------------------------------------
    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return jsonResponse(
        {
          success: false,
          error: "A music prompt is required",
        },
        400,
      );
    }

    // -----------------------------------------
    // BUILD INPUT
    // -----------------------------------------
    const input: Record<string, unknown> = {
      prompt,
    };

    // Optional duration
    if (
      typeof body?.duration === "number" &&
      body.duration > 0
    ) {
      input.duration = body.duration;
    }

    console.log(
      "Sending music request to FAL",
    );

    // -----------------------------------------
    // CALL FAL
    // -----------------------------------------
    const response = await fetch(
      `https://fal.run/${FAL_MUSIC_MODEL}`,
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
    // READ RESPONSE AS TEXT FIRST
    // -----------------------------------------
    const rawResponse =
      await response.text();

    console.log(
      "FAL music status:",
      response.status,
    );

    console.log(
      "FAL response length:",
      rawResponse.length,
    );

    // -----------------------------------------
    // EMPTY RESPONSE
    // -----------------------------------------
    if (!rawResponse.trim()) {
      console.error(
        "FAL returned an empty response",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Music provider returned an empty response",
          provider_status: response.status,
        },
        502,
      );
    }

    // -----------------------------------------
    // PARSE FAL RESPONSE
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
            "Music provider returned invalid JSON",
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
        "FAL MUSIC ERROR:",
        data,
      );

      const providerError =
        data?.detail ||
        data?.error ||
        data?.message ||
        "Music generation failed";

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
    // FIND AUDIO URL
    // -----------------------------------------
    const audioUrl =
      data?.audio?.url ??
      data?.audio_file?.url ??
      data?.audio_url ??
      data?.output?.audio?.url ??
      data?.output?.audio_file?.url ??
      null;

    // -----------------------------------------
    // NO AUDIO URL
    // -----------------------------------------
    if (!audioUrl) {
      console.error(
        "No audio URL found:",
        data,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Music generation completed but no audio URL was returned",
          data,
        },
        502,
      );
    }

    // -----------------------------------------
    // SUCCESS
    // -----------------------------------------
    console.log(
      "Music generated successfully",
    );

    return jsonResponse({
      success: true,
      audio_url: audioUrl,
      music_url: audioUrl,
      audio: audioUrl,
      data,
    });
  } catch (error) {
    console.error(
      "GENERATE MUSIC ERROR:",
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