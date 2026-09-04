import { fal } from "npm:@fal-ai/client@1.7.2";

/* =========================================================
   DESTINY AI - SUPABASE EDGE FUNCTION
   ========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type": "application/json",
};

/* =========================================================
   API KEYS
   =========================================================
   
   IMPORTANT:
   Put the real keys in Supabase Edge Function Secrets.

   GROQ_API_KEY = gsk_...
   FAL_KEY = ...

   DO NOT put the real keys in this file.
   ========================================================= */

const GROQ_API_KEY =
  Deno.env.get("GROQ_API_KEY") ?? "";

const FAL_KEY =
  Deno.env.get("FAL_KEY") ?? "";

/* =========================================================
   MODELS
   ========================================================= */

const GROQ_MODEL =
  Deno.env.get("GROQ_MODEL") ??
  "llama-3.3-70b-versatile";

const FAL_IMAGE_MODEL =
  Deno.env.get("FAL_IMAGE_MODEL") ??
  "fal-ai/flux/schnell";

const FAL_VIDEO_MODEL =
  Deno.env.get("FAL_VIDEO_MODEL") ??
  "fal-ai/wan/v2.2-a14b/text-to-video";

const FAL_MUSIC_MODEL =
  Deno.env.get("FAL_MUSIC_MODEL") ??
  "fal-ai/musicgen";

const FAL_TTS_MODEL =
  Deno.env.get("FAL_TTS_MODEL") ?? "";

/* =========================================================
   FAL CONFIG
   ========================================================= */

if (FAL_KEY) {
  fal.config({
    credentials: FAL_KEY,
  });
}

/* =========================================================
   TYPES
   ========================================================= */

type RequestType =
  | "chat"
  | "image"
  | "video"
  | "music"
  | "tts";

type ChatMessage = {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
};

type RequestBody = {
  message?: string;

  prompt?: string;

  type?: RequestType | string;

  model?: string;

  messages?: ChatMessage[];

  history?: ChatMessage[];

  temperature?: number;

  max_tokens?: number;

  voice?: string;
};

/* =========================================================
   JSON RESPONSE
   ========================================================= */

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders,
    },
  );
}

/* =========================================================
   REQUEST DETECTION
   ========================================================= */

function detectRequestType(
  message: string,
  requestedType?: string,
): RequestType {
  if (
    requestedType === "image" ||
    requestedType === "video" ||
    requestedType === "music" ||
    requestedType === "tts" ||
    requestedType === "chat"
  ) {
    return requestedType;
  }

  const text =
    message.toLowerCase().trim();

  /* -------------------------------------------------------
     IMAGE
     ------------------------------------------------------- */

  const imageWords = [
    "create an image",
    "create image",
    "generate an image",
    "generate image",
    "make an image",
    "make image",
    "draw an image",
    "draw image",
    "create a picture",
    "create picture",
    "generate a picture",
    "generate picture",
    "make a picture",
    "make picture",
    "draw",
    "illustrate",
    "design an image",
    "image of",
    "picture of",
    "photo of",
  ];

  if (
    imageWords.some(
      (word) =>
        text.includes(word),
    )
  ) {
    return "image";
  }

  /* -------------------------------------------------------
     VIDEO
     ------------------------------------------------------- */

  const videoWords = [
    "create a video",
    "create video",
    "generate a video",
    "generate video",
    "make a video",
    "make video",
    "text to video",
    "animate this",
    "animation of",
    "video of",
  ];

  if (
    videoWords.some(
      (word) =>
        text.includes(word),
    )
  ) {
    return "video";
  }

  /* -------------------------------------------------------
     MUSIC
     ------------------------------------------------------- */

  const musicWords = [
    "create music",
    "generate music",
    "make music",
    "compose music",
    "create a song",
    "generate a song",
    "make a song",
    "instrumental",
    "background music",
    "generate a beat",
    "make a beat",
  ];

  if (
    musicWords.some(
      (word) =>
        text.includes(word),
    )
  ) {
    return "music";
  }

  /* -------------------------------------------------------
     DEFAULT
     ------------------------------------------------------- */

  return "chat";
}

/* =========================================================
   GROQ CHAT
   ========================================================= */

async function generateChat(
  message: string,
  history: ChatMessage[] = [],
  model?: string,
  temperature = 0.7,
  maxTokens = 2048,
) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Add it to Supabase Edge Function Secrets.",
    );
  }

  const safeHistory =
    Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (
                item.role ===
                  "user" ||
                item.role ===
                  "assistant" ||
                item.role ===
                  "system"
              ) &&
              typeof item.content ===
                "string",
          )
          .slice(-20)
      : [];

  const messages: ChatMessage[] = [
    {
      role: "system",

      content: `
You are Destiny AI, a powerful, helpful and professional AI assistant.

Your name is Destiny AI.

You help users with:

- General questions
- Education
- Mathematics
- Physics
- Chemistry
- Programming
- Web development
- Mobile app development
- Business
- Writing
- Research
- Creative ideas
- Problem solving
- Technology

Rules:

1. Give accurate and useful answers.
2. Be clear and easy to understand.
3. Use examples when helpful.
4. When writing code, provide complete working code when practical.
5. Do not claim that you performed an action when you did not.
6. If something is uncertain, say so.
7. Follow the user's instructions.
8. Keep formatting clean and readable.
      `.trim(),
    },

    ...safeHistory,

    {
      role: "user",

      content: message,
    },
  ];

  const response =
    await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${GROQ_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            model || GROQ_MODEL,

          messages,

          temperature,

          max_tokens:
            maxTokens,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Groq API error:",
      data,
    );

    throw new Error(
      data?.error?.message ??
        `Groq API returned HTTP ${response.status}`,
    );
  }

  const reply =
    data?.choices?.[0]
      ?.message?.content;

  if (!reply) {
    throw new Error(
      "Groq returned an empty response.",
    );
  }

  return {
    reply,

    model:
      model || GROQ_MODEL,
  };
}

/* =========================================================
   FAL URL EXTRACTION
   ========================================================= */

function extractUrl(
  result: any,
): string | null {
  const urls = [
    result?.data?.images?.[0]?.url,

    result?.images?.[0]?.url,

    result?.data?.video?.url,

    result?.video?.url,

    result?.data?.audio?.url,

    result?.audio?.url,

    result?.data?.audio_url,

    result?.audio_url,

    result?.data?.url,

    result?.url,

    result?.data?.output?.url,

    result?.output?.url,

    result?.data?.output,

    result?.output,
  ];

  for (const value of urls) {
    if (
      typeof value ===
        "string" &&
      value.startsWith("http")
    ) {
      return value;
    }
  }

  return null;
}

/* =========================================================
   IMAGE
   ========================================================= */

async function generateImage(
  prompt: string,
) {
  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY is missing. Add it to Supabase Edge Function Secrets.",
    );
  }

  const result =
    await fal.subscribe(
      FAL_IMAGE_MODEL,
      {
        input: {
          prompt,

          image_size:
            "landscape_16_9",

          num_images: 1,
        },

        logs: false,
      },
    );

  console.log(
    "FAL image result:",
    JSON.stringify(result),
  );

  const imageUrl =
    result?.data?.images?.[0]
      ?.url ??
    result?.images?.[0]?.url ??
    extractUrl(result);

  if (!imageUrl) {
    throw new Error(
      "FAL did not return an image URL.",
    );
  }

  return {
    imageUrl,

    model:
      FAL_IMAGE_MODEL,
  };
}

/* =========================================================
   VIDEO
   ========================================================= */

async function generateVideo(
  prompt: string,
) {
  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY is missing. Add it to Supabase Edge Function Secrets.",
    );
  }

  const result =
    await fal.subscribe(
      FAL_VIDEO_MODEL,
      {
        input: {
          prompt,
        },

        logs: false,
      },
    );

  console.log(
    "FAL video result:",
    JSON.stringify(result),
  );

  const videoUrl =
    result?.data?.video?.url ??
    result?.video?.url ??
    extractUrl(result);

  if (!videoUrl) {
    throw new Error(
      "FAL did not return a video URL.",
    );
  }

  return {
    videoUrl,

    model:
      FAL_VIDEO_MODEL,
  };
}

/* =========================================================
   MUSIC
   ========================================================= */

async function generateMusic(
  prompt: string,
) {
  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY is missing. Add it to Supabase Edge Function Secrets.",
    );
  }

  const result =
    await fal.subscribe(
      FAL_MUSIC_MODEL,
      {
        input: {
          prompt,
        },

        logs: false,
      },
    );

  console.log(
    "FAL music result:",
    JSON.stringify(result),
  );

  const audioUrl =
    result?.data?.audio?.url ??
    result?.audio?.url ??
    result?.data?.audio_url ??
    result?.audio_url ??
    extractUrl(result);

  if (!audioUrl) {
    throw new Error(
      "FAL did not return an audio URL.",
    );
  }

  return {
    audioUrl,

    model:
      FAL_MUSIC_MODEL,
  };
}

/* =========================================================
   TEXT TO SPEECH
   ========================================================= */

async function generateTTS(
  text: string,
  voice?: string,
) {
  if (!FAL_KEY) {
    throw new Error(
      "FAL_KEY is missing.",
    );
  }

  if (!FAL_TTS_MODEL) {
    throw new Error(
      "FAL_TTS_MODEL is not configured.",
    );
  }

  const result =
    await fal.subscribe(
      FAL_TTS_MODEL,
      {
        input: {
          text,

          ...(voice
            ? { voice }
            : {}),
        },

        logs: false,
      },
    );

  console.log(
    "FAL TTS result:",
    JSON.stringify(result),
  );

  const audioUrl =
    result?.data?.audio?.url ??
    result?.audio?.url ??
    result?.data?.audio_url ??
    result?.audio_url ??
    extractUrl(result);

  if (!audioUrl) {
    throw new Error(
      "FAL did not return an audio URL.",
    );
  }

  return {
    audioUrl,

    model:
      FAL_TTS_MODEL,
  };
}

/* =========================================================
   MAIN FUNCTION
   ========================================================= */

Deno.serve(
  async (req: Request) => {
    /* -----------------------------------------------------
       OPTIONS / CORS
       ----------------------------------------------------- */

    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    /* -----------------------------------------------------
       POST ONLY
       ----------------------------------------------------- */

    if (
      req.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Only POST requests are supported.",
        },

        405,
      );
    }

    try {
      /* ---------------------------------------------------
         READ BODY
         --------------------------------------------------- */

      const body =
        (await req.json()) as RequestBody;

      const message =
        body.message?.trim() ||
        body.prompt?.trim() ||
        "";

      if (!message) {
        return jsonResponse(
          {
            success: false,

            error:
              "Please provide a message or prompt.",
          },

          400,
        );
      }

      /* ---------------------------------------------------
         DETECT TYPE
         --------------------------------------------------- */

      const type =
        detectRequestType(
          message,
          body.type,
        );

      console.log(
        "Destiny AI request:",
        type,
      );

      /* ===================================================
         CHAT
         =================================================== */

      if (type === "chat") {
        const result =
          await generateChat(
            message,

            body.messages ||
              body.history ||
              [],

            body.model,

            typeof body.temperature ===
              "number"
              ? body.temperature
              : 0.7,

            typeof body.max_tokens ===
              "number"
              ? body.max_tokens
              : 2048,
          );

        return jsonResponse({
          success: true,

          type: "chat",

          reply:
            result.reply,

          model:
            result.model,
        });
      }

      /* ===================================================
         IMAGE
         =================================================== */

      if (type === "image") {
        const result =
          await generateImage(
            message,
          );

        return jsonResponse({
          success: true,

          type: "image",

          reply:
            "I've generated your image.",

          imageUrl:
            result.imageUrl,

          url:
            result.imageUrl,

          model:
            result.model,
        });
      }

      /* ===================================================
         VIDEO
         =================================================== */

      if (type === "video") {
        const result =
          await generateVideo(
            message,
          );

        return jsonResponse({
          success: true,

          type: "video",

          reply:
            "I've generated your video.",

          videoUrl:
            result.videoUrl,

          url:
            result.videoUrl,

          model:
            result.model,
        });
      }

      /* ===================================================
         MUSIC
         =================================================== */

      if (type === "music") {
        const result =
          await generateMusic(
            message,
          );

        return jsonResponse({
          success: true,

          type: "music",

          reply:
            "I've generated your music.",

          audioUrl:
            result.audioUrl,

          url:
            result.audioUrl,

          model:
            result.model,
        });
      }

      /* ===================================================
         TTS
         =================================================== */

      if (type === "tts") {
        const result =
          await generateTTS(
            message,

            body.voice,
          );

        return jsonResponse({
          success: true,

          type: "tts",

          reply:
            "I've generated your audio.",

          audioUrl:
            result.audioUrl,

          url:
            result.audioUrl,

          model:
            result.model,
        });
      }

      /* ---------------------------------------------------
         UNKNOWN TYPE
         --------------------------------------------------- */

      return jsonResponse(
        {
          success: false,

          error:
            "Unsupported request type.",
        },

        400,
      );
    } catch (error) {
      console.error(
        "Destiny AI error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unexpected server error.";

      return jsonResponse(
        {
          success: false,

          error: message,
        },

        500,
      );
    }
  },
);