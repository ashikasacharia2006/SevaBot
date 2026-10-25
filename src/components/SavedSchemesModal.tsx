import React from 'react';
import { motion } from 'motion/react';
import { X, Bookmark, Trash2, ExternalLink, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { SavedSchemeData } from '../lib/firebase';

interface SavedSchemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedSchemes: SavedSchemeData[];
  onRemoveScheme: (schemeId: string) => void;
  onAskAboutScheme: (schemeTitle: string) => void;
  translations?: Record<string, string>;
  userEmail?: string | null;
}

export default function SavedSchemesModal({
  isOpen,
  onClose,
  savedSchemes,
  onRemoveScheme,
  onAskAboutScheme,
  translations = {},
  userEmail
}: SavedSchemesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="maroon-gradient p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">My Saved Schemes</h3>
              <p className="text-xs text-white/80 mt-0.5">
                {userEmail ? `Synced to Firestore (${userEmail})` : 'Saved locally on this device'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {savedSchemes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-bold text-slate-700">No saved schemes yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Discover schemes through the Scheme Finder or Chatbot and click bookmark to save them for later reference.
              </p>
            </div>
          ) : (
            savedSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-brand-orange/40 bg-white hover:bg-orange-50/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">{scheme.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-brand-maroon uppercase">
                      {scheme.category || 'General'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {scheme.state || 'Central'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {scheme.benefitSummary || 'Welfare benefits and direct assistance provided by the Government.'}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Saved on {new Date(scheme.savedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onAskAboutScheme(scheme.title);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-maroon text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    title="Ask SevaBot about this scheme"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ask SevaBot</span>
                  </button>
                  <button
                    onClick={() => onRemoveScheme(scheme.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Total {savedSchemes.length} bookmarked {savedSchemes.length === 1 ? 'scheme' : 'schemes'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-maroon text-white rounded-xl text-xs font-bold hover:bg-brand-maroon/90 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
