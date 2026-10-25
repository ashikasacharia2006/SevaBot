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

type HistoryItem = { role: 'user' | 'model', parts: { text: string }[] };

/**
 * All Gemini calls go through the /api/gemini Netlify Function,
 * which authenticates via Netlify AI Gateway (no API key in the browser).
 */
async function callGemini<T = { text: string }>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI request failed (${res.status})`);
  }
  return data as T;
}

export interface ChatOptions {
  model?: ChatModelTier;
  groundingTool?: GroundingToolType;
  targetLanguage?: string;
}

export async function getChatResponse(
  message: string, 
  history: HistoryItem[],
  targetLanguage: string = "English",
  options?: ChatOptions
) {
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
        tools = [{ googleSearch: {} }];
      }
    }

    const { text } = await callGemini({
      action: 'chat',
      model: selectedModel,
      systemInstruction: SYSTEM_INSTRUCTION + langInstruction,
      history,
      message,
      tools,
    });
    
    return text || "I was unable to retrieve details for that scheme. Please check the official government portal at myscheme.gov.in.";
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later or visit the official government portal at https://myscheme.gov.in.";
  }
}

/**
 * Transcribe recorded audio from the microphone
 */
export async function transcribeAudio(
  base64Audio: string, 
  mimeType: string = "audio/webm"
): Promise<string | null> {
  try {
    const { text } = await callGemini({
      action: 'transcribe',
      data: base64Audio,
      mimeType: mimeType || "audio/webm",
      prompt: "Transcribe this spoken audio accurately. If the audio is in Hindi, English, Tamil, Telugu, or any other Indian language, transcribe the spoken words verbatim. Return ONLY the transcribed text without extra preamble, formatting, or commentary.",
    });
    return text?.trim() || null;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return null;
  }
}

function cleanForSpeech(text: string) {
  return text
    .replace(/[*#_>`~]/g, '') // Remove common markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
}

/**
 * Text-to-Speech synthesis. Returns base64 PCM (24kHz) or null when
 * the server TTS model is unavailable — callers then use speakWithBrowser.
 */
export async function generateSpeech(text: string, voiceName: string = 'Kore') {
  const cleanText = cleanForSpeech(text).slice(0, 3000);
  if (!cleanText) return null;

  try {
    const { audio } = await callGemini<{ audio: string | null }>({
      action: 'speech',
      text: cleanText,
      voiceName: voiceName || 'Kore',
    });
    return audio || null;
  } catch (error) {
    console.warn("Server speech unavailable, falling back to browser voice:", error);
    return null;
  }
}

// Gemini voice personas mapped to a preferred browser voice gender.
const FEMALE_VOICES = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Autonoe', 'Callirrhoe', 'Despina', 'Erinome', 'Laomedeia', 'Pulcherrima', 'Vindemiatrix', 'Achernar', 'Gacrux', 'Sulafat'];

export function toSpeechLang(langCode?: string) {
  if (!langCode || langCode === 'en') return 'en-IN';
  return langCode.includes('-') ? langCode : `${langCode}-IN`;
}

function pickBrowserVoice(lang: string, voiceName: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  const matches = voices.filter(v => v.lang === lang || v.lang.startsWith(base));
  if (matches.length === 0) return undefined;
  const wantFemale = FEMALE_VOICES.includes(voiceName);
  const gendered = matches.find(v => wantFemale ? /female|woman|heera|swara|neerja/i.test(v.name) : /male|man|ravi|prabhat|madhur/i.test(v.name) && !/female/i.test(v.name));
  return gendered || matches[0];
}

export interface BrowserSpeechOptions {
  lang?: string;
  voiceName?: string;
  rate?: number;
  pitch?: number; // cents, -200..200
  volume?: number;
  onEnd?: () => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Stop browser speech without firing the previous utterance's callbacks.
 */
export function stopBrowserSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (currentUtterance) {
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
    currentUtterance = null;
  }
  window.speechSynthesis.cancel();
}

/**
 * Speak text using the browser's built-in speech synthesis.
 */
export function speakWithBrowser(text: string, opts: BrowserSpeechOptions = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    opts.onEnd?.();
    return null;
  }
  const synth = window.speechSynthesis;
  stopBrowserSpeech();
  const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text).slice(0, 5000));
  const lang = opts.lang || 'en-IN';
  utterance.lang = lang;
  const voice = pickBrowserVoice(lang, opts.voiceName || 'Kore');
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = Math.max(0, Math.min(2, 1 + (opts.pitch ?? 0) / 400));
  utterance.volume = Math.max(0, Math.min(1, opts.volume ?? 1));
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onEnd?.();
  currentUtterance = utterance;
  synth.speak(utterance);
  return utterance;
}

/**
 * Real-time voice conversation. Uses the browser's speech recognition for
 * listening, Gemini (via /api/gemini) for answers, and speech synthesis for
 * replies. Exposes the same session shape as the Live API.
 */
export async function connectLive(callbacks: any, voiceName: string = 'Kore', langCode?: string, langName: string = 'English') {
  const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionImpl) {
    throw new Error("Speech recognition is not supported in this browser.");
  }

  const lang = toSpeechLang(langCode);
  const history: HistoryItem[] = [];
  let closed = false;
  let busy = false;

  const recognition = new SpeechRecognitionImpl();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = false;

  const resume = () => {
    busy = false;
    if (!closed) {
      try { recognition.start(); } catch { /* already started */ }
    }
  };

  recognition.onresult = async (event: any) => {
    const result = event.results[event.results.length - 1];
    const transcript = result?.[0]?.transcript?.trim();
    if (!result?.isFinal || !transcript || busy) return;

    busy = true;
    try { recognition.stop(); } catch { /* ignore */ }
    callbacks.onmessage?.({ serverContent: { modelTurn: { parts: [{ text: `\n🗣️ ${transcript}\n` }] } } });

    const reply = await getChatResponse(
      transcript + "\n\n(Answer concisely for spoken voice output, without markdown tables.)",
      history,
      langName,
      { model: 'gemini-3.1-flash-lite', groundingTool: 'none' }
    );
    if (closed) return;
    history.push({ role: 'user', parts: [{ text: transcript }] });
    history.push({ role: 'model', parts: [{ text: reply }] });

    callbacks.onmessage?.({ serverContent: { modelTurn: { parts: [{ text: `🤖 ${reply}\n` }] } } });
    speakWithBrowser(reply, { lang, voiceName, onEnd: resume });
  };

  recognition.onend = () => {
    if (!closed && !busy) {
      try { recognition.start(); } catch { /* ignore */ }
    }
  };

  recognition.onerror = (e: any) => {
    if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
      callbacks.onerror?.(e);
    }
  };

  recognition.start();
  callbacks.onopen?.();

  return {
    sendRealtimeInput: (_input: unknown) => { /* audio is captured by speech recognition */ },
    close: () => {
      if (closed) return;
      closed = true;
      try { recognition.abort(); } catch { /* ignore */ }
      stopBrowserSpeech();
      callbacks.onclose?.();
    },
  };
}

/**
 * Translate scheme text
 */
export async function translateText(text: string, targetLanguage: string) {
  try {
    const { text: translated } = await callGemini({
      action: 'generate',
      model: 'gemini-3.8-flash',
      contents: [{ 
        role: 'user',
        parts: [{ 
          text: `Translate the following text to ${targetLanguage}. Keep the markdown formatting if any. Only return the translated text.\n\nText: ${text}` 
        }] 
      }],
      config: { temperature: 0.1 },
    });
    return translated;
  } catch (error) {
    console.error("Error translating text:", error);
    return null;
  }
}
