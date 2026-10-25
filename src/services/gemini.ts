import { GoogleGenAI, Modality } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are SevaBot, a helpful and professional AI Government Scheme Assistant for citizens of India. 
Your goal is to help users discover welfare schemes, subsidies, and public services.

CRITICAL INSTRUCTIONS:
1. Provide detailed information about the APPLICATION PROCESS for each scheme.
2. List exactly which DOCUMENTS and PHOTOS are required for the application.
3. If a scheme requires specific eligibility criteria (age, income, category), state them clearly.
4. Use a polite, helpful, and professional tone.
5. If you don't know a specific detail, suggest checking the official government portal (like myscheme.gov.in or india.gov.in).
6. Provide information in a structured way:
   - Scheme Name
   - Benefits & Subsidies
   - Eligibility Criteria
   - Application Process (Step-by-step)
   - Required Documents & Checklist
7. When answering location-specific queries or finding nearby Seva Kendras, Common Service Centers (CSCs), and welfare offices, provide actionable location details, official portal links, or contact numbers.
8. Support all Indian languages (Hindi, Tamil, Telugu, Marathi, Bengali, Kannada, Gujarati, Malayalam, etc.) when requested.
9. Always remind citizens to verify guidelines on official government websites (.gov.in).
10. Use Markdown for clear, scannable formatting.`;

export type ChatModelTier = 'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite';
export type GroundingToolType = 'search' | 'maps' | 'none';

export function getAIInstance() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export interface ChatOptions {
  model?: ChatModelTier;
  groundingTool?: GroundingToolType;
  targetLanguage?: string;
}

export async function getChatResponse(
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  targetLanguage: string = "English",
  options?: ChatOptions
) {
  const ai = getAIInstance();
  
  // Model selection per requirements:
  // - gemini-4-argon for particularly complex tasks
  // - gemini-3.8-flash for general tasks
  // - gemini-3.1-flash-lite for tasks that should happen fast
  const selectedModel: ChatModelTier = options?.model || 'gemini-3.8-flash';
  const groundingTool: GroundingToolType = options?.groundingTool ?? (
    message.toLowerCase().includes('near me') || 
    message.toLowerCase().includes('csc center') || 
    message.toLowerCase().includes('seva kendra') || 
    message.toLowerCase().includes('office') || 
    message.toLowerCase().includes('collectorate') ||
    message.toLowerCase().includes('where to apply')
      ? 'maps' 
      : 'search'
  );

  try {
    const lang = options?.targetLanguage || targetLanguage;
    const langInstruction = lang && lang !== 'English'
      ? `\n\nCRITICAL LANGUAGE REQUIREMENT: The user's active interface language is ${lang}. You MUST respond completely and fluently in ${lang}. Translate all scheme explanations, benefits, eligibility criteria, step-by-step application procedures, and documents needed directly into ${lang}. If mentioning central scheme names, you may include the official title and its ${lang} transliteration/meaning.`
      : ``;

    // Configure tools:
    // Notice: googleMaps cannot be used together with googleSearch
    let tools: any[] | undefined = undefined;
    if (selectedModel === 'gemini-3.8-flash') {
      if (groundingTool === 'maps') {
        tools = [{ googleMaps: {} }];
      } else if (groundingTool === 'search') {
        tools = [
          { googleSearch: {} }
        ];
      }
    }

    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION + langInstruction,
    };

    if (tools && tools.length > 0) {
      config.tools = tools;
    }

    const chat = ai.chats.create({
      model: selectedModel,
      config,
      history,
    });

    const result = await chat.sendMessage({ 
      message,
    });
    
    return result.text || "I was unable to retrieve details for that scheme. Please check the official government portal at myscheme.gov.in.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later or visit the official government portal at https://myscheme.gov.in.";
  }
}

/**
 * Transcribe recorded audio with microphone using model: gemini-3.5-transcribe
 */
export async function transcribeAudio(
  base64Audio: string, 
  mimeType: string = "audio/webm"
): Promise<string | null> {
  const ai = getAIInstance();
  const model = "gemini-3.5-transcribe";

  try {
    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { 
        parts: [
          audioPart, 
          { text: "Transcribe this spoken audio accurately. If the audio is in Hindi, English, Tamil, Telugu, or any other Indian language, transcribe the spoken words verbatim. Return ONLY the transcribed text without extra preamble, formatting, or commentary." }
        ] 
      },
    });

    const text = response.text?.trim();
    return text || null;
  } catch (error) {
    console.error("Error transcribing audio with gemini-3.5-transcribe:", error);
    return null;
  }
}

/**
 * Text-to-Speech synthesis
 */
export async function generateSpeech(text: string, voiceName: string = 'Kore', retries = 2) {
  const ai = getAIInstance();
  const model = "gemini-2.5-flash-preview-tts";

  // Clean text for TTS: remove markdown symbols and extra whitespace
  const cleanText = text
    .replace(/[*#_>`~]/g, '') // Remove common markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
    .slice(0, 3000); // Truncate to a safe length for TTS

  if (!cleanText) return null;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return base64Audio;
      }
      return null;
    } catch (error) {
      console.error(`Error generating speech (attempt ${i + 1}/${retries + 1}):`, error);
      if (i === retries) return null;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return null;
}

/**
 * Real-time bidirectional voice conversation with model: gemini-3.8-live (Live API)
 */
export function connectLive(callbacks: any, voiceName: string = 'Kore') {
  const ai = getAIInstance();
  return ai.live.connect({
    model: "gemini-3.8-live",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || "Kore" } },
      },
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nProvide helpful, concise real-time voice guidance about Indian government schemes.",
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
}

/**
 * Translate scheme text
 */
export async function translateText(text: string, targetLanguage: string) {
  const ai = getAIInstance();
  const model = "gemini-3.8-flash";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ 
        parts: [{ 
          text: `Translate the following text to ${targetLanguage}. Keep the markdown formatting if any. Only return the translated text.\n\nText: ${text}` 
        }] 
      }],
      config: {
        temperature: 0.1,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error translating text:", error);
    return null;
  }
}
