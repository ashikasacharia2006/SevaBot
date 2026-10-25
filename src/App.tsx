/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Info, 
  CheckCircle2, 
  Users, 
  Globe, 
  Send, 
  Bot, 
  User, 
  ChevronRight, 
  Phone, 
  Mail, 
  MapPin,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
  Heart,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Volume1,
  Pause,
  Play,
  Languages,
  Radio,
  Power,
  Waves,
  RotateCcw,
  FileDown,
  Settings,
  Bookmark,
  LogIn,
  LogOut,
  Cpu,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  getChatResponse, 
  generateSpeech, 
  connectLive, 
  translateText, 
  transcribeAudio, 
  speakWithBrowser,
  stopBrowserSpeech,
  toSpeechLang,
  ChatModelTier, 
  GroundingToolType 
} from './services/gemini';
import { cn } from './lib/utils';
import { TRANSLATIONS } from './lib/translations';
import SchemeFinder from './components/SchemeFinder';
import ChatExportModal from './components/ChatExportModal';
import VoiceSettingsModal, { VoiceSynthesisSettings, DEFAULT_VOICE_SETTINGS } from './components/VoiceSettingsModal';
import SavedSchemesModal from './components/SavedSchemesModal';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  saveScheme, 
  removeScheme, 
  fetchSavedSchemes, 
  persistChatSession, 
  SavedSchemeData 
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface Message {
  role: 'user' | 'model';
  content: string;
  audioUrl?: string;
  translatedContent?: string;
  isTranslating?: boolean;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'as', name: 'অসমীয়া (Assamese)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'sa', name: 'संस्कृतम् (Sanskrit)' },
  { code: 'ne', name: 'नेपाली (Nepali)' },
  { code: 'sd', name: 'سنڌي (Sindhi)' },
  { code: 'ks', name: 'کٲشُر (Kashmiri)' },
  { code: 'doi', name: 'डोगरी (Dogri)' },
  { code: 'kok', name: 'कोंकणी (Konkani)' },
  { code: 'mai', name: 'मैथिली (Maithili)' },
  { code: 'mni', name: 'মৈতৈলোন (Manipuri)' },
  { code: 'brx', name: 'बर\' (Bodo)' },
  { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)' },
  { code: 'tcy', name: 'ತುಳು (Tulu)' },
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "" } // Initialized in useEffect
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSynthesisSettings>(() => {
    try {
      const saved = localStorage.getItem('sevabot_voice_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return DEFAULT_VOICE_SETTINGS;
  });

  const [autoPlay, setAutoPlay] = useState(() => {
    try {
      const saved = localStorage.getItem('sevabot_voice_settings');
      if (saved) return JSON.parse(saved).autoPlay ?? true;
    } catch (e) {}
    return true;
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioVolume, setAudioVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('sevabot_voice_settings');
      if (saved) return JSON.parse(saved).volume ?? 1;
    } catch (e) {}
    return 1;
  });
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(() => {
    try {
      const saved = localStorage.getItem('sevabot_voice_settings');
      if (saved) return JSON.parse(saved).speed ?? 1;
    } catch (e) {}
    return 1;
  });
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);
  const [showFinderPage, setShowFinderPage] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSavedSchemesModal, setShowSavedSchemesModal] = useState(false);

  // Firebase Auth & Saved Schemes
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [savedSchemes, setSavedSchemes] = useState<SavedSchemeData[]>([]);

  // Gemini Model Tier & Grounding Tool State
  const [chatModel, setChatModel] = useState<ChatModelTier>('gemini-3.8-flash');
  const [groundingTool, setGroundingTool] = useState<GroundingToolType>('search');

  // Audio Recording & Gemini 3.5 Transcription State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sync Firebase Auth & Firestore Saved Schemes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const schemes = await fetchSavedSchemes(user.uid);
          setSavedSchemes(schemes);
        } catch (err) {
          console.error("Failed to load saved schemes from Firestore:", err);
        }
      } else {
        // Fallback to local storage for guest
        try {
          const local = localStorage.getItem('sevabot_guest_saved_schemes');
          if (local) {
            setSavedSchemes(JSON.parse(local));
          } else {
            setSavedSchemes([]);
          }
        } catch (e) {
          setSavedSchemes([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setPermissionError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Sign-in failed:", err);
      setPermissionError(err.message || "Failed to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error("Sign out failed:", err);
    }
  };

  const handleToggleSaveScheme = async (scheme: any) => {
    const schemeId = scheme.id || scheme.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `scheme-${Date.now()}`;
    const isSaved = savedSchemes.some(s => s.id === schemeId);

    if (isSaved) {
      const updated = savedSchemes.filter(s => s.id !== schemeId);
      setSavedSchemes(updated);
      if (currentUser) {
        await removeScheme(currentUser.uid, schemeId).catch(console.error);
      } else {
        localStorage.setItem('sevabot_guest_saved_schemes', JSON.stringify(updated));
      }
    } else {
      const schemeData: SavedSchemeData = {
        id: schemeId,
        title: scheme.name || scheme.title || 'Government Scheme',
        name: scheme.name || scheme.title || 'Government Scheme',
        category: scheme.category || 'General Welfare',
        state: scheme.state || 'All India',
        benefitSummary: scheme.benefits || scheme.benefitSummary || 'Financial & welfare support assistance',
        benefits: scheme.benefits || 'Financial & welfare support assistance',
        eligibility: scheme.eligibility || 'Check scheme criteria for qualification',
        applyUrl: scheme.applyUrl || 'https://www.india.gov.in/my-government/schemes',
        savedAt: new Date().toISOString()
      };
      const updated = [schemeData, ...savedSchemes];
      setSavedSchemes(updated);
      if (currentUser) {
        await saveScheme(currentUser.uid, schemeData).catch(console.error);
      } else {
        localStorage.setItem('sevabot_guest_saved_schemes', JSON.stringify(updated));
      }
    }
  };

  const handleAskAboutScheme = (schemeTitle: string) => {
    setShowSavedSchemesModal(false);
    setShowFinderPage(false);
    setInput(`Tell me all details, eligibility criteria, and application process for ${schemeTitle}`);
    setTimeout(() => {
      const el = document.getElementById('chatbot');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleUpdateVoiceSettings = (newSettings: VoiceSynthesisSettings) => {
    const prevVoice = voiceSettings.voiceName;
    setVoiceSettings(newSettings);
    setAutoPlay(newSettings.autoPlay);
    setAudioVolume(newSettings.volume);
    setAudioPlaybackRate(newSettings.speed);
    try {
      localStorage.setItem('sevabot_voice_settings', JSON.stringify(newSettings));
    } catch (e) {}

    // If voice persona changed, clear cached audioUrls so messages re-synthesize in new persona
    if (newSettings.voiceName !== prevVoice) {
      setMessages(prev => prev.map(m => ({ ...m, audioUrl: undefined })));
    }
  };
  
  const t = (key: string) => {
    const langCode = selectedLang.code;
    const translation = TRANSLATIONS[langCode]?.[key] || TRANSLATIONS['en']?.[key] || key;
    return translation;
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const standardAudioContextRef = useRef<AudioContext | null>(null);
  
  // Live API Refs
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingLiveRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // Update initial greeting message when language changes
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ role: 'model', content: t('initial_message') }];
      }
      return prev.map((msg, idx) => {
        if (idx === 0 && msg.role === 'model') {
          return { ...msg, content: t('initial_message') };
        }
        return msg;
      });
    });

    // Auto-translate any existing model messages to selected language
    if (selectedLang.code !== 'en') {
      messages.forEach((msg, idx) => {
        if (idx > 0 && msg.role === 'model' && !msg.isTranslating) {
          handleTranslate(idx);
        }
      });
    }
  }, [selectedLang]);

  useEffect(() => {
    return () => {
      standardAudioContextRef.current?.close();
    };
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLang.code === 'en' ? 'en-IN' : selectedLang.code;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setPermissionError(null);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setPermissionError("Microphone access denied. Please enable microphone permissions in your browser settings to use voice search.");
        } else {
          setPermissionError(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setPermissionError("Speech recognition is not supported in this browser.");
    }
  }, [selectedLang]);

  const startAudioRecording = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) {
          setIsRecordingAudio(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || mimeType });
        setIsRecordingAudio(false);
        setIsTranscribing(true);

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1];
              const transcription = await transcribeAudio(base64Data, audioBlob.type || 'audio/webm');
              if (transcription && transcription.trim()) {
                setInput(prev => (prev ? `${prev.trim()} ${transcription.trim()}` : transcription.trim()));
              }
            } catch (err: any) {
              console.error("Transcription error:", err);
              setPermissionError("Audio transcription failed. Please try again.");
            } finally {
              setIsTranscribing(false);
            }
          };
        } catch (err: any) {
          console.error("Error reading audio data:", err);
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setPermissionError("Microphone access denied or not available. Please allow mic permissions.");
      setIsRecordingAudio(false);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isRecordingAudio) {
      stopAudioRecording();
    } else {
      startAudioRecording();
    }
  };

  const playAudio = async (text: string, messageIndex: number) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (isSpeaking && playingMessageIndex === messageIndex) {
      if (!currentSourceRef.current && synth?.speaking) {
        if (isAudioPaused) {
          synth.resume();
          setIsAudioPaused(false);
        } else {
          synth.pause();
          setIsAudioPaused(true);
        }
      } else if (standardAudioContextRef.current) {
        if (isAudioPaused) {
          await standardAudioContextRef.current.resume();
          setIsAudioPaused(false);
        } else {
          await standardAudioContextRef.current.suspend();
          setIsAudioPaused(true);
        }
      }
      return;
    }

    if (isSpeaking) {
      currentSourceRef.current?.stop();
      currentSourceRef.current = null;
      stopBrowserSpeech();
      setIsSpeaking(false);
      setIsGeneratingAudio(false);
      setIsAudioPaused(false);
      setPlayingMessageIndex(null);
    }

    setIsSpeaking(true);
    setPlayingMessageIndex(messageIndex);
    try {
      let audioUrl = messages[messageIndex]?.audioUrl;
      
      if (!audioUrl) {
        setIsGeneratingAudio(true);
        try {
          const base64Audio = await generateSpeech(text, voiceSettings.voiceName);
          if (base64Audio) {
            audioUrl = `data:audio/wav;base64,${base64Audio}`;
            setMessages(prev => {
              const next = [...prev];
              if (next[messageIndex]) {
                next[messageIndex] = { ...next[messageIndex], audioUrl };
              }
              return next;
            });
          }
        } finally {
          setIsGeneratingAudio(false);
        }
      }

      if (audioUrl) {
        if (!standardAudioContextRef.current) {
          standardAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const audioCtx = standardAudioContextRef.current;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        setIsAudioPaused(false);

        const base64Data = audioUrl.split(',')[1] || audioUrl;
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 0x7FFF;
        }

        const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = audioPlaybackRate;
        if (source.detune) {
          source.detune.value = voiceSettings.pitch;
        }

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = audioVolume;
        gainNodeRef.current = gainNode;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.onended = () => {
          setIsSpeaking(false);
          currentSourceRef.current = null;
          setPlayingMessageIndex(null);
          setIsAudioPaused(false);
        };
        currentSourceRef.current = source;
        source.start();
      } else {
        // Server voice unavailable: use the browser's speech synthesis
        speakWithBrowser(text, {
          lang: toSpeechLang(selectedLang.code),
          voiceName: voiceSettings.voiceName,
          rate: audioPlaybackRate,
          pitch: voiceSettings.pitch,
          volume: audioVolume,
          onEnd: () => {
            setIsSpeaking(false);
            setPlayingMessageIndex(null);
            setIsAudioPaused(false);
          },
        });
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsSpeaking(false);
      setIsGeneratingAudio(false);
      currentSourceRef.current = null;
      setPlayingMessageIndex(null);
    }
  };

  const changeAudioVolume = (value: number) => {
    setAudioVolume(value);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(value, standardAudioContextRef.current?.currentTime || 0, 0.1);
    }
  };

  const changeAudioSpeed = (value: number) => {
    setAudioPlaybackRate(value);
    if (currentSourceRef.current) {
      currentSourceRef.current.playbackRate.setTargetAtTime(value, standardAudioContextRef.current?.currentTime || 0, 0.1);
    }
  };

  const refreshChat = () => {
    if (isSpeaking) {
      stopBrowserSpeech();
      currentSourceRef.current?.stop();
      currentSourceRef.current = null;
      setIsSpeaking(false);
    }
    setMessages([
      { role: 'model', content: t('initial_message') }
    ]);
    setInput('');
    setIsLoading(false);
    setIsGeneratingAudio(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Calculate the index for the model response
    const modelMessageIndex = messages.length + 1;

    const updatedWithUser: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedWithUser);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await getChatResponse(userMessage, history, selectedLang.name, {
      model: chatModel,
      groundingTool: groundingTool
    });
    
    const finalMessages: Message[] = [...updatedWithUser, { role: 'model', content: response }];
    setMessages(finalMessages);
    setIsLoading(false);

    // Persist conversation to Firestore if authenticated
    if (currentUser) {
      persistChatSession(currentUser.uid, finalMessages, chatModel).catch(err => {
        console.error("Could not persist chat session to Firestore:", err);
      });
    }

    if (autoPlay) {
      // Use the pre-calculated index
      setTimeout(() => {
        playAudio(response, modelMessageIndex);
      }, 600);
    }
  };

  const handleTranslate = async (index: number) => {
    const msg = messages[index];
    if (msg.role !== 'model' || msg.isTranslating) return;

    // If already translated to the current selected language, just toggle or do nothing
    // For simplicity, we'll re-translate if the target language is different or if not yet translated
    
    setMessages(prev => {
      const next = [...prev];
      next[index] = { ...next[index], isTranslating: true };
      return next;
    });

    const translated = await translateText(msg.content, selectedLang.name);

    setMessages(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { 
          ...next[index], 
          translatedContent: translated || undefined, 
          isTranslating: false 
        };
      }
      return next;
    });
  };

  // Live API Logic
  const startLiveSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsLiveActive(true);
      setPermissionError(null);

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (liveSessionRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          
          // Efficient base64 conversion
          let binary = '';
          const bytes = new Uint8Array(pcmData.buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);
          
          liveSessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      // Add high-pass filter to remove low-frequency noise
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(100, audioContextRef.current.currentTime);
      
      sourceRef.current.connect(filter);
      filter.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      const session = await connectLive({
        onopen: () => console.log("Live session opened"),
        onmessage: async (message: any) => {
          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
            const binary = atob(base64Audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            // Convert Int16 to Float32
            const int16Data = new Int16Array(bytes.buffer);
            const float32Data = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
              float32Data[i] = int16Data[i] / 0x7FFF;
            }
            playbackQueueRef.current.push(float32Data);
            if (!isPlayingLiveRef.current) {
              playNextLiveChunk();
            }
          }
          
          if (message.serverContent?.interrupted) {
            playbackQueueRef.current = [];
            isPlayingLiveRef.current = false;
            nextStartTimeRef.current = 0;
          }

          if (message.serverContent?.modelTurn?.parts[0]?.text) {
            setLiveTranscript(prev => prev + message.serverContent.modelTurn.parts[0].text);
          }
        },
        onclose: () => stopLiveSession(),
        onerror: (err: any) => {
          console.error("Live session error:", err);
          stopLiveSession();
        }
      }, voiceSettings.voiceName, selectedLang.code, selectedLang.name);

      liveSessionRef.current = session;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setPermissionError("Could not access microphone for live chat.");
      setIsLiveActive(false);
    }
  };

  const playNextLiveChunk = () => {
    if (playbackQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingLiveRef.current = false;
      return;
    }

    isPlayingLiveRef.current = true;
    const chunk = playbackQueueRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 16000);
    buffer.getChannelData(0).set(chunk);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    if (source.detune) {
      source.detune.value = voiceSettings.pitch;
    }
    
    // Add dynamics compressor for more consistent voice levels
    const compressor = audioContextRef.current.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, audioContextRef.current.currentTime);
    compressor.knee.setValueAtTime(40, audioContextRef.current.currentTime);
    compressor.ratio.setValueAtTime(12, audioContextRef.current.currentTime);
    compressor.attack.setValueAtTime(0, audioContextRef.current.currentTime);
    compressor.release.setValueAtTime(0.25, audioContextRef.current.currentTime);
    
    source.connect(compressor);
    compressor.connect(audioContextRef.current.destination);
    
    // Schedule for gapless playback
    const now = audioContextRef.current.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    source.onended = () => playNextLiveChunk();
  };

  const stopLiveSession = () => {
    setIsLiveActive(false);
    liveSessionRef.current?.close();
    liveSessionRef.current = null;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    playbackQueueRef.current = [];
    isPlayingLiveRef.current = false;
  };

  const quickQueries = [
    t('query_scholarships'),
    t('query_farmers'),
    t('query_startup'),
    t('query_pension')
  ];

  return (
    <div className="min-h-screen font-sans">
      <AnimatePresence mode="wait">
        {showFinderPage ? (
          <motion.div
            key="finder"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen bg-slate-50"
          >
            <SchemeFinder 
              onClose={() => setShowFinderPage(false)} 
              onAskSevaBot={() => {
                setShowFinderPage(false);
                setTimeout(() => {
                  const el = document.getElementById('chatbot');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              translations={TRANSLATIONS[selectedLang.code] || TRANSLATIONS['en']} 
              selectedLang={selectedLang}
              onSelectLang={(lang) => setSelectedLang(lang)}
              languages={LANGUAGES}
              onToggleSaveScheme={handleToggleSaveScheme}
              isSchemeSaved={(schemeTitle) => {
                const schemeId = schemeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return savedSchemes.some(s => s.id === schemeId || s.name === schemeTitle);
              }}
              onOpenSavedSchemes={() => setShowSavedSchemesModal(true)}
              savedSchemesCount={savedSchemes.length}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 maroon-gradient rounded-lg flex items-center justify-center">
                <Bot className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-brand-maroon">{t('brand_name')}</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">
                  <Languages className="w-4 h-4" />
                  {selectedLang.name}
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang)}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl",
                        selectedLang.code === lang.code ? "text-brand-orange font-bold" : "text-slate-600"
                      )}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
              <a href="#home" className="text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">{t('nav_home')}</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">{t('nav_about')}</a>
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">{t('nav_features')}</a>
              <a href="#chatbot" className="text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">{t('nav_chatbot')}</a>
              <a href="#benefits" className="text-sm font-medium text-slate-600 hover:text-brand-maroon transition-colors">{t('nav_benefits')}</a>
              <button 
                onClick={() => setShowFinderPage(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-full text-sm font-bold hover:bg-brand-orange hover:text-white transition-all"
              >
                <Search className="w-4 h-4" />
                {t('nav_find_schemes')}
              </button>

              {/* Saved Schemes */}
              <button 
                onClick={() => setShowSavedSchemesModal(true)}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-bold transition-all"
                title="Saved Schemes Bookmarks"
              >
                <Bookmark className="w-4 h-4 text-brand-orange fill-brand-orange" />
                <span>Saved</span>
                {savedSchemes.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-brand-orange text-white text-xs font-bold rounded-full">
                    {savedSchemes.length}
                  </span>
                )}
              </button>

              {/* Google Sign In / User Profile */}
              {currentUser ? (
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs shadow-xs">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName || "User"} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand-maroon text-white flex items-center justify-center font-bold text-[10px]">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-700 max-w-[100px] truncate">
                    {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
                  </span>
                  <button 
                    onClick={handleSignOut} 
                    title="Sign Out"
                    className="p-1 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-sm font-bold transition-all shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-brand-maroon" />
                  <span>Sign In</span>
                </button>
              )}

              <a href="#contact" className="px-5 py-2 maroon-gradient text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all">{t('nav_get_started')}</a>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLang(lang);
                        setIsMenuOpen(false);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs rounded-full border transition-all",
                        selectedLang.code === lang.code 
                          ? "bg-brand-orange text-white border-brand-orange" 
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      )}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
                <a href="#home" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_home')}</a>
                <a href="#about" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_about')}</a>
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_features')}</a>
                <a href="#chatbot" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_chatbot')}</a>
                <a href="#benefits" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_benefits')}</a>
                
                {/* Mobile Saved Schemes */}
                <button 
                  onClick={() => {
                    setShowSavedSchemesModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-xl text-slate-700 font-bold"
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-brand-orange fill-brand-orange" />
                    Saved Schemes
                  </span>
                  <span className="px-2 py-0.5 bg-brand-orange text-white text-xs font-bold rounded-full">
                    {savedSchemes.length}
                  </span>
                </button>

                {/* Mobile Auth Button */}
                {currentUser ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="User" className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-maroon text-white flex items-center justify-center font-bold text-xs">
                          {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-slate-800 text-sm">{currentUser.displayName || currentUser.email}</span>
                    </div>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleSignIn();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 w-full p-3 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
                  >
                    <LogIn className="w-5 h-5 text-brand-maroon" />
                    Sign in with Google
                  </button>
                )}

                <button 
                  onClick={() => {
                    setShowFinderPage(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-4 bg-brand-orange/10 text-brand-orange rounded-2xl text-lg font-bold"
                >
                  <Search className="w-6 h-6" />
                  {t('nav_find_schemes')}
                </button>
                <a href="#contact" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-600">{t('nav_contact')}</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wider text-brand-orange uppercase bg-orange-50 rounded-full border border-orange-100">
              {t('hero_badge')}
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-brand-maroon mb-6 leading-tight">
              {t('hero_title_1')} <br />
              <span className="text-brand-orange">{t('hero_title_2')}</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-600 mb-10">
              {t('hero_desc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setShowFinderPage(true)}
                className="w-full sm:w-auto px-8 py-4 bg-brand-orange text-white rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                {t('nav_find_schemes')}
              </button>
              <button 
                onClick={() => {
                  const el = document.getElementById('chatbot');
                  el?.scrollIntoView({ behavior: 'smooth' });
                  if (!isLiveActive) startLiveSession();
                }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-brand-maroon border-2 border-brand-maroon/10 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                {t('hero_btn_live')} <Radio className="w-5 h-5 animate-pulse" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/government/800/800" 
                  alt="Citizen Services" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 glass-card p-6 rounded-2xl max-w-xs hidden sm:block">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ShieldCheck className="text-green-600 w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-800">{t('trusted_info_title')}</span>
                </div>
                <p className="text-sm text-slate-500">{t('trusted_info_desc')}</p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-brand-maroon mb-6">{t('about_title')}</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                {t('about_desc')}
              </p>
              <div className="space-y-4">
                {[
                  t('about_item_1'),
                  t('about_item_2'),
                  t('about_item_3'),
                  t('about_item_4'),
                  t('about_item_5')
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-brand-orange w-6 h-6 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 px-4">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-brand-maroon mb-4">{t('features_title')}</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">{t('features_subtitle')}</p>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-8 h-8 text-brand-orange" />,
              title: t('feature_1_title'),
              desc: t('feature_1_desc')
            },
            {
              icon: <Globe className="w-8 h-8 text-brand-orange" />,
              title: t('feature_2_title'),
              desc: t('feature_2_desc')
            },
            {
              icon: <Waves className="w-8 h-8 text-brand-orange" />,
              title: t('feature_3_title'),
              desc: t('feature_3_desc')
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
            >
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-brand-maroon mb-3">{feature.title}</h3>
              <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Chatbot Section */}
      <section id="chatbot" className="py-24 bg-white px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-brand-maroon mb-4">{t('chatbot_title')}</h2>
            <p className="text-slate-600">{t('chatbot_subtitle')}</p>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[650px] border-slate-200 relative">
            {/* Live Mode Overlay */}
            <AnimatePresence>
              {isLiveActive && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 maroon-gradient flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="relative mb-12">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center"
                    >
                      <Bot className="w-16 h-16 text-white" />
                    </motion.div>
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 border-4 border-white/30 rounded-full"
                    />
                  </div>
                  
                  <h3 className="text-3xl font-bold text-white mb-4">{t('chat_live_overlay_title')}</h3>
                  <p className="text-white/70 mb-8 max-w-md">
                    {t('chat_live_overlay_desc')}
                  </p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={stopLiveSession}
                      className="px-8 py-3 bg-white text-brand-maroon rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"
                    >
                      <Power className="w-5 h-5" /> {t('chat_live_overlay_btn_end')}
                    </button>
                  </div>

                  <div className="mt-12 w-full max-w-lg bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-bold">{t('chat_live_overlay_transcript_label')}</p>
                    <p className="text-white text-sm italic">
                      {liveTranscript || t('chat_live_overlay_placeholder')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Header */}
            <div className="maroon-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold leading-none">SevaBot AI</p>
                  <p className="text-xs text-white/70 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    {t('chat_header_status').replace('{lang}', selectedLang.name)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Voice Synthesis Settings */}
                <button 
                  onClick={() => setShowVoiceSettings(true)}
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title="Voice & Speech Settings (Change Voice, Gender, Pitch & Speed)"
                >
                  <Settings className="w-4 h-4 text-brand-orange" />
                  <span className="hidden md:inline">{voiceSettings.voiceName}</span>
                </button>

                <button 
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                  title={t('chat_export_tooltip')}
                >
                  <FileDown className="w-4 h-4 text-brand-orange" />
                  <span className="hidden sm:inline">{t('chat_export')}</span>
                </button>
                <button 
                  onClick={refreshChat}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="Refresh Chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={startLiveSession}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 text-xs font-bold"
                  title="Start Live Voice Session"
                >
                  <Radio className="w-4 h-4" /> LIVE
                </button>
                <button 
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    autoPlay ? "bg-white/20" : "hover:bg-white/10"
                  )}
                  title={autoPlay ? "Auto-play audio enabled" : "Auto-play audio disabled"}
                >
                  {autoPlay ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Info className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Model Tier & Grounding Control Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Gemini Model Tier */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-brand-maroon" /> Model:
                </span>
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setChatModel('gemini-3.8-flash')}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1",
                      chatModel === 'gemini-3.8-flash'
                        ? "bg-brand-maroon text-white shadow-xs"
                        : "text-slate-600 hover:text-brand-maroon"
                    )}
                    title="General Tasks: Fast, balanced, and responsive (gemini-3.8-flash)"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>3.8 Flash (General)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModel('gemini-4-argon')}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1",
                      chatModel === 'gemini-4-argon'
                        ? "bg-brand-maroon text-white shadow-xs"
                        : "text-slate-600 hover:text-brand-maroon"
                    )}
                    title="Complex Tasks: Deep reasoning for intricate policy schemes & multi-criteria eligibility (gemini-4-argon)"
                  >
                    <span>4 Argon (Complex)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModel('gemini-3.1-flash-lite')}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1",
                      chatModel === 'gemini-3.1-flash-lite'
                        ? "bg-brand-maroon text-white shadow-xs"
                        : "text-slate-600 hover:text-brand-maroon"
                    )}
                    title="Fast Tasks: Ultra-low latency responses (gemini-3.1-flash-lite)"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>3.1 Lite (Fast)</span>
                  </button>
                </div>
              </div>

              {/* Real-time Grounding Selector */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-brand-orange" /> Grounding:
                </span>
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setGroundingTool('search')}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1",
                      groundingTool === 'search'
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-slate-600 hover:text-brand-orange"
                    )}
                    title="Google Search Grounding: Live official scheme circulars and notifications"
                  >
                    <Search className="w-3 h-3" />
                    <span>Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroundingTool('maps')}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1",
                      groundingTool === 'maps'
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-slate-600 hover:text-brand-orange"
                    )}
                    title="Google Maps Grounding: Locate nearest Seva Kendras, CSC centers & welfare offices"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Maps</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'user' ? "bg-brand-orange" : "bg-brand-maroon"
                  )}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm relative group",
                    msg.role === 'user' 
                      ? "bg-brand-orange text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  )}>
                    {msg.role === 'model' && (
                      <div className="absolute -right-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => playAudio(msg.translatedContent || msg.content, i)}
                          className="p-2 text-slate-400 hover:text-brand-orange"
                          title={isSpeaking && playingMessageIndex === i ? (isAudioPaused ? t('audio_play') : t('audio_pause')) : t('audio_play')}
                        >
                          {isSpeaking && playingMessageIndex === i ? (
                            isAudioPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4 text-brand-orange" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleTranslate(i)}
                          disabled={msg.isTranslating}
                          className={cn(
                            "p-2 text-slate-400 hover:text-brand-orange transition-colors",
                            msg.isTranslating && "animate-spin"
                          )}
                          title={`Translate to ${selectedLang.name}`}
                        >
                          <Languages className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-brand-maroon prose-a:text-brand-orange">
                      <ReactMarkdown>{msg.translatedContent || msg.content}</ReactMarkdown>
                    </div>
                    {msg.translatedContent && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{t('chat_translated_to').replace('{lang}', selectedLang.name)}</span>
                        <button 
                          onClick={() => {
                            setMessages(prev => {
                              const next = [...prev];
                              next[i] = { ...next[i], translatedContent: undefined };
                              return next;
                            });
                          }}
                          className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                        >
                          {t('chat_toggle_original')}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto">
                  <div className="w-8 h-8 bg-brand-maroon rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                </div>
              )}
              {messages.length > 1 && !isLoading && (
                <div className="flex justify-center pt-2 pb-1">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-orange-50 hover:text-brand-orange hover:border-brand-orange/40 border border-slate-200 text-[11px] font-bold text-slate-600 transition-all shadow-xs"
                    title={t('chat_export_tooltip')}
                  >
                    <FileDown className="w-3.5 h-3.5 text-brand-orange" />
                    <span>{t('chat_export')} (PDF / .txt)</span>
                  </button>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Scheme Finder Modal Removed - Now a full page */}

            {/* Audio Generation Indicator */}
            <AnimatePresence>
              {isGeneratingAudio && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
                >
                  <div className="bg-white/90 backdrop-blur-sm border border-brand-orange/20 px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
                    <div className="flex gap-1">
                      <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-brand-orange rounded-full" />
                      <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-brand-orange rounded-full" />
                      <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-brand-orange rounded-full" />
                    </div>
                    <span className="text-xs font-bold text-brand-maroon uppercase tracking-wider">{t('chat_processing_audio')}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

      {/* Audio Controls Bar */}
            <AnimatePresence>
              {isSpeaking && playingMessageIndex !== null && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="px-6 py-3 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => playAudio("", playingMessageIndex)}
                      className="p-2 bg-brand-orange text-white rounded-full hover:bg-brand-maroon transition-colors"
                      title={isAudioPaused ? t('audio_play') : t('audio_pause')}
                    >
                      {isAudioPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-brand-maroon uppercase tracking-wider">{t('audio_playing')}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[150px]">
                        {messages[playingMessageIndex]?.translatedContent || messages[playingMessageIndex]?.content}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 flex-1 w-full max-w-md">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2 flex-1">
                      <Volume1 className="w-4 h-4 text-slate-400" />
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={audioVolume} 
                        onChange={(e) => changeAudioVolume(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                      />
                      <Volume2 className="w-4 h-4 text-slate-400" />
                    </div>
                    
                    {/* Speed Control */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{t('audio_speed')}</span>
                      <select 
                        value={audioPlaybackRate} 
                        onChange={(e) => changeAudioSpeed(parseFloat(e.target.value))}
                        className="text-xs font-bold text-brand-orange bg-slate-50 border-none rounded p-1 focus:ring-0"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setShowVoiceSettings(true)}
                      className="p-2 text-slate-400 hover:text-brand-orange transition-colors"
                      title="Voice Settings (Gender & Pitch)"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        currentSourceRef.current?.stop();
                        currentSourceRef.current = null;
                        stopBrowserSpeech();
                        setIsSpeaking(false);
                        setPlayingMessageIndex(null);
                        setIsAudioPaused(false);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500"
                      title="Stop Audio"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Queries */}
            {permissionError && (
              <div className="px-6 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                <p className="text-xs text-red-600 font-medium">{permissionError}</p>
                <button onClick={() => setPermissionError(null)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 overflow-x-auto">
              <div className="flex gap-2 whitespace-nowrap">
                {quickQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                    }}
                    className="text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-brand-orange hover:text-brand-orange transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini 3.5 Transcribing Indicator */}
            <AnimatePresence>
              {isTranscribing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-center gap-2 text-xs font-semibold text-amber-800"
                >
                  <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span>Transcribing speech with <strong>gemini-3.5-transcribe</strong>...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isTranscribing}
                className={cn(
                  "p-3 rounded-xl transition-all relative",
                  isRecordingAudio 
                    ? "bg-red-500 text-white shadow-lg animate-pulse scale-105" 
                    : isTranscribing 
                      ? "bg-amber-100 text-amber-700 opacity-80 cursor-wait"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
                title={
                  isRecordingAudio 
                    ? "Stop recording & transcribe with gemini-3.5-transcribe" 
                    : "Speak to Chatbot (Powered by gemini-3.5-transcribe)"
                }
              >
                {isRecordingAudio ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6" />}
                {isRecordingAudio && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></span>
                )}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isRecordingAudio
                    ? "Recording voice... Click mic to transcribe with gemini-3.5-transcribe"
                    : isTranscribing
                      ? "Transcribing your voice with gemini-3.5-transcribe..."
                      : t('chat_input_placeholder')
                }
                className="flex-1 px-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-brand-orange transition-all outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isTranscribing}
                className="p-3 maroon-gradient text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
              >
                <Send className="w-6 h-6" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-brand-maroon text-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t('benefits_title')}</h2>
            <p className="text-white/70 max-w-2xl mx-auto">{t('benefits_subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: t('benefit_1_label'), icon: <Users className="w-6 h-6" />, desc: t('benefit_1_desc') },
              { label: t('benefit_2_label'), icon: <Zap className="w-6 h-6" />, desc: t('benefit_2_desc') },
              { label: t('benefit_3_label'), icon: <Globe className="w-6 h-6" />, desc: t('benefit_3_desc') },
              { label: t('benefit_4_label'), icon: <Heart className="w-6 h-6" />, desc: t('benefit_4_desc') }
            ].map((benefit, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/10 hover:bg-white/20 transition-all">
                <div className="w-12 h-12 bg-brand-orange rounded-xl flex items-center justify-center mb-6">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.label}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact/Feedback Section */}
      <section id="contact" className="py-24 bg-slate-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden grid md:grid-cols-2">
            <div className="p-12 maroon-gradient text-white">
              <h2 className="text-4xl font-bold mb-6">{t('contact_title')}</h2>
              <p className="text-white/70 mb-10">{t('contact_subtitle')}</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">{t('contact_email_label')}</p>
                    <p className="font-bold">{t('contact_email_value')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">{t('contact_phone_label')}</p>
                    <p className="font-bold">{t('contact_phone_value')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">{t('contact_address_label')}</p>
                    <p className="font-bold">{t('footer_address')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-12">
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('form_name')}</label>
                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-maroon outline-none transition-all" placeholder={t('form_placeholder_name')} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">{t('form_email')}</label>
                    <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-maroon outline-none transition-all" placeholder={t('form_placeholder_email')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{t('form_subject')}</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-maroon outline-none transition-all">
                    <option>{t('form_option_inquiry')}</option>
                    <option>{t('form_option_feedback')}</option>
                    <option>{t('form_option_bug')}</option>
                    <option>{t('form_option_suggestion')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">{t('form_message')}</label>
                  <textarea rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-maroon outline-none transition-all" placeholder={t('form_placeholder_message')}></textarea>
                </div>
                <button className="w-full py-4 maroon-gradient text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all">
                  {t('form_btn_send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 maroon-gradient rounded-lg flex items-center justify-center">
                  <Bot className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight">{t('brand_name')}</span>
              </div>
              <p className="text-slate-400 max-w-sm mb-6">
                {t('footer_desc')}
              </p>
              <div className="flex gap-4">
                {/* Social placeholders */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
                    <div className="w-5 h-5 bg-slate-500 rounded-sm"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6">{t('footer_links')}</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#home" className="hover:text-white transition-colors">{t('nav_home')}</a></li>
                <li><a href="#about" className="hover:text-white transition-colors">{t('nav_about')}</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">{t('nav_features')}</a></li>
                <li><a href="#chatbot" className="hover:text-white transition-colors">{t('nav_chatbot')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">{t('footer_resources')}</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer_official')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer_privacy')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer_terms')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer_help')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 text-center text-slate-500 text-sm">
            <p>{t('footer_copy').replace('{year}', new Date().getFullYear().toString())}</p>
          </div>
        </div>
      </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Export Modal */}
      <ChatExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        messages={messages}
        selectedLang={selectedLang}
        translations={TRANSLATIONS[selectedLang.code] || TRANSLATIONS['en']}
      />

      {/* Global Voice Synthesis Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        settings={voiceSettings}
        onUpdateSettings={handleUpdateVoiceSettings}
        translations={TRANSLATIONS[selectedLang.code] || TRANSLATIONS['en']}
        selectedLang={selectedLang}
      />

      {/* Saved Schemes Modal with Firestore Persistence */}
      <SavedSchemesModal
        isOpen={showSavedSchemesModal}
        onClose={() => setShowSavedSchemesModal(false)}
        savedSchemes={savedSchemes}
        onRemoveScheme={(id) => handleToggleSaveScheme({ id })}
        onAskAboutScheme={handleAskAboutScheme}
        translations={TRANSLATIONS[selectedLang.code] || TRANSLATIONS['en']}
        userEmail={currentUser?.email || currentUser?.displayName}
      />
    </div>
  );
}
