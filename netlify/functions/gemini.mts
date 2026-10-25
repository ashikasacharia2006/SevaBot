import { GoogleGenAI, Modality } from "@google/genai";

// Credentials are injected at runtime by Netlify AI Gateway.
const ai = new GoogleGenAI({});

const CHAT_MODELS = ["gemini-3.8-flash", "gemini-4-argon", "gemini-3.1-flash-lite"];
const DEFAULT_MODEL = "gemini-3.8-flash";

type Body =
  | {
      action: "chat";
      model?: string;
      systemInstruction: string;
      history: { role: "user" | "model"; parts: { text: string }[] }[];
      message: string;
      tools?: any[];
    }
  | { action: "generate"; model?: string; contents: any; config?: any }
  | { action: "transcribe"; data: string; mimeType: string; prompt: string }
  | { action: "speech"; text: string; voiceName: string };

function pickModel(model?: string) {
  return model && CHAT_MODELS.includes(model) ? model : DEFAULT_MODEL;
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "chat": {
        const model = pickModel(body.model);
        const run = async (tools?: any[]) => {
          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction: body.systemInstruction,
              ...(tools && tools.length > 0 ? { tools } : {}),
            },
            history: body.history || [],
          });
          const result = await chat.sendMessage({ message: body.message });
          return result.text;
        };
        let text: string | undefined;
        try {
          text = await run(body.tools);
        } catch (err) {
          // Grounding tools may be unavailable; retry without them.
          if (!body.tools?.length) throw err;
          console.warn("Grounded chat failed, retrying without tools:", err);
          text = await run();
        }
        return Response.json({ text: text || "" });
      }

      case "generate": {
        const response = await ai.models.generateContent({
          model: pickModel(body.model),
          contents: body.contents,
          config: body.config,
        });
        return Response.json({ text: response.text || "" });
      }

      case "transcribe": {
        const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: {
            role: "user",
            parts: [
              { inlineData: { mimeType: body.mimeType || "audio/webm", data: body.data } },
              { text: body.prompt },
            ],
          },
        });
        return Response.json({ text: response.text?.trim() || "" });
      }

      case "speech": {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: body.text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: body.voiceName || "Kore" } },
            },
          },
        });
        const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return Response.json({ audio: audio || null });
      }

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Gemini ${(body as any).action} error:`, error);
    return Response.json({ error: error?.message || "AI request failed" }, { status: 502 });
  }
};

export const config = {
  path: "/api/gemini",
};
