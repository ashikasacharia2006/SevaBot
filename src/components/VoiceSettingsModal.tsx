import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Settings, 
  Volume2, 
  Volume1, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  User, 
  Sliders, 
  Gauge, 
  Activity
} from 'lucide-react';
import { generateSpeech } from '../services/gemini';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  description: string;
  tone: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', gender: 'female', description: 'Calm & Professional', tone: 'Official Citizen Advisory' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Clear & Thoughtful', tone: 'Gentle & Articulate' },
  { id: 'Leda', name: 'Leda', gender: 'female', description: 'Warm & Friendly', tone: 'Helpful & Empathetic' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Breezy & Natural', tone: 'Modern & Soft' },
  { id: 'Puck', name: 'Puck', gender: 'male', description: 'Energetic & Crisp', tone: 'Clear & Engaging' },
  { id: 'Charon', name: 'Charon', gender: 'male', description: 'Calm & Deep', tone: 'Authoritative & Reassuring' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Strong & Steady', tone: 'Formal & Confident' },
  { id: 'Orus', name: 'Orus', gender: 'male', description: 'Resonant & Grounded', tone: 'Deep Voice' },
];

export interface VoiceSynthesisSettings {
  voiceName: string;
  genderFilter: 'all' | 'female' | 'male';
  pitch: number; // in cents: -600 to +600, default 0
  speed: number; // 0.75 to 1.75, default 1.0
  autoPlay: boolean;
  volume: number; // 0 to 1, default 1.0
}

export const DEFAULT_VOICE_SETTINGS: VoiceSynthesisSettings = {
  voiceName: 'Kore',
  genderFilter: 'all',
  pitch: 0,
  speed: 1.0,
  autoPlay: true,
  volume: 1.0,
};

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSynthesisSettings;
  onUpdateSettings: (newSettings: VoiceSynthesisSettings) => void;
  translations?: Record<string, string>;
  selectedLang?: { code: string; name: string };
}

export default function VoiceSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  translations = {},
  selectedLang
}: VoiceSettingsModalProps) {
  const [activeGenderTab, setActiveGenderTab] = useState<'all' | 'female' | 'male'>(settings.genderFilter || 'all');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioCtxRef = React.useRef<AudioContext | null>(null);
  const previewSourceRef = React.useRef<AudioBufferSourceNode | null>(null);

  const t = (key: string) => translations[key] || key;

  const filteredVoices = AVAILABLE_VOICES.filter(voice => {
    if (activeGenderTab === 'all') return true;
    return voice.gender === activeGenderTab;
  });

  const stopPreviewAudio = () => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      previewSourceRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const handleTestVoice = async (targetVoiceName = settings.voiceName) => {
    stopPreviewAudio();
    setIsPreviewLoading(true);

    try {
      const sampleText = selectedLang && selectedLang.code !== 'en'
        ? "नमस्ते! मैं सेवाबॉट हूँ, आपका सरकारी योजना सहायक।"
        : "Namaste! I am SevaBot, your AI government welfare assistant.";

      const base64Audio = await generateSpeech(sampleText, targetVoiceName);
      if (!base64Audio) {
        setIsPreviewLoading(false);
        return;
      }

      const audioCtx = previewAudioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      previewAudioCtxRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 0x7FFF;
      }

      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = settings.speed;

      // Apply pitch detune in cents
      if (source.detune) {
        source.detune.value = settings.pitch;
      }

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = settings.volume;

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      source.onended = () => {
        setIsPlayingPreview(false);
        previewSourceRef.current = null;
      };

      previewSourceRef.current = source;
      setIsPlayingPreview(true);
      source.start();
    } catch (err) {
      console.error("Failed to preview voice:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleReset = () => {
    stopPreviewAudio();
    onUpdateSettings(DEFAULT_VOICE_SETTINGS);
    setActiveGenderTab('all');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="maroon-gradient p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">
                {t('voice_settings_title') || 'Voice & Audio Settings'}
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                {t('voice_settings_subtitle') || 'Customize AI voice gender, tone, pitch, and playback'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopPreviewAudio();
              onClose();
            }}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Voice Persona / Gender Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-orange" />
                  AI Voice Persona & Gender
                </label>
                <p className="text-xs text-slate-500">
                  Select a male or female synthesized persona for SevaBot responses
                </p>
              </div>

              {/* Gender Filter Tabs */}
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                {(['all', 'female', 'male'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveGenderTab(tab);
                      onUpdateSettings({ ...settings, genderFilter: tab });
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${
                      activeGenderTab === tab
                        ? 'bg-brand-maroon text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {filteredVoices.map(voice => {
                const isSelected = settings.voiceName === voice.id;
                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      onUpdateSettings({ ...settings, voiceName: voice.id });
                    }}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-brand-orange bg-orange-50/70 ring-2 ring-brand-orange/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{voice.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            voice.gender === 'female'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {voice.gender}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{voice.description}</p>
                      <p className="text-[10px] text-slate-400 truncate">{voice.tone}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSettings({ ...settings, voiceName: voice.id });
                          handleTestVoice(voice.id);
                        }}
                        disabled={isPreviewLoading}
                        className={`p-2 rounded-xl transition-all ${
                          isSelected
                            ? 'bg-brand-orange text-white hover:bg-brand-maroon shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={`Sample ${voice.name}`}
                      >
                        {isPlayingPreview && settings.voiceName === voice.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-brand-orange text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pitch Control */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-orange" />
                  Voice Pitch
                </label>
                <p className="text-xs text-slate-500">
                  Adjust fundamental frequency: make voice deeper or higher
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-brand-maroon bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  {settings.pitch === 0 ? 'Natural (0)' : settings.pitch > 0 ? `+${settings.pitch} cents` : `${settings.pitch} cents`}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="-500"
                max="500"
                step="50"
                value={settings.pitch}
                onChange={(e) => onUpdateSettings({ ...settings, pitch: parseInt(e.target.value, 10) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
              />
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span className="text-indigo-600">Deep / Lower (-500)</span>
                <span className="text-slate-600">Natural (0)</span>
                <span className="text-amber-600">Higher / Bright (+500)</span>
              </div>
            </div>

            {/* Pitch Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
              {[
                { label: 'Deep (-300)', val: -300 },
                { label: 'Natural (0)', val: 0 },
                { label: 'High (+300)', val: 300 }
              ].map(preset => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, pitch: preset.val })}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                    settings.pitch === preset.val
                      ? 'bg-brand-maroon text-white border-brand-maroon'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speech Rate & Volume Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Speed / Rate */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-brand-orange" />
                  Playback Speed
                </label>
                <span className="text-xs font-bold text-brand-orange bg-white px-2 py-0.5 rounded border border-slate-200">
                  {settings.speed}x
                </span>
              </div>
              <div className="flex gap-1.5 pt-1">
                {[0.75, 1.0, 1.25, 1.5].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, speed: rate })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      settings.speed === rate
                        ? 'bg-brand-maroon text-white border-brand-maroon'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-brand-orange" />
                  Voice Volume
                </label>
                <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Volume1 className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => onUpdateSettings({ ...settings, volume: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
                <Volume2 className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Auto-Play Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-xs font-bold text-slate-800">Auto-Play Voice on Response</p>
              <p className="text-[11px] text-slate-500">Automatically speak scheme explanations when SevaBot answers</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, autoPlay: !settings.autoPlay })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                settings.autoPlay ? 'bg-brand-orange' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.autoPlay ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Test Sample Playback Bar */}
          <div className="p-4 bg-orange-50/60 rounded-2xl border border-brand-orange/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Preview Voice Settings</p>
                <p className="text-[11px] text-slate-500">
                  Hear {settings.voiceName} with {settings.pitch === 0 ? 'natural pitch' : `${settings.pitch} cents pitch`} at {settings.speed}x
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTestVoice(settings.voiceName)}
              disabled={isPreviewLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-maroon text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isPreviewLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : isPlayingPreview ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Playing Preview</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Test Voice Sample</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>

          <button
            type="button"
            onClick={() => {
              stopPreviewAudio();
              onClose();
            }}
            className="px-6 py-2 bg-brand-maroon hover:bg-brand-maroon/90 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
