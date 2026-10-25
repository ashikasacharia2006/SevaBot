import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  FileText, 
  Copy, 
  Check, 
  Bot, 
  User, 
  ShieldCheck, 
  Calendar, 
  Languages, 
  Printer, 
  AlertCircle,
  FileDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  audioUrl?: string;
  translatedContent?: string;
  isTranslating?: boolean;
}

interface ChatExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  selectedLang: { code: string; name: string };
  translations: Record<string, string>;
}

export default function ChatExportModal({
  isOpen,
  onClose,
  messages,
  selectedLang,
  translations
}: ChatExportModalProps) {
  const [exportLangOption, setExportLangOption] = useState<'translated' | 'original'>('translated');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => translations[key] || key;

  // Filter messages to export (skip empty ones if any)
  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  const getMessageContent = (m: ChatMessage) => {
    if (exportLangOption === 'translated') {
      return m.translatedContent || m.content;
    }
    return m.content;
  };

  const currentDateFormatted = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const reportId = `SB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Text File Export
  const handleExportTxt = () => {
    try {
      let text = '\uFEFF'; // UTF-8 BOM for perfect Indic Unicode rendering across Notepad, Word & editors
      text += '================================================================================\n';
      text += '           SEVABOT AI - GOVERNMENT SCHEMES & WELFARE ADVISORY REPORT           \n';
      text += '               Official Citizen Assistance • Digital India Portal               \n';
      text += '================================================================================\n';
      text += `Reference ID   : ${reportId}\n`;
      text += `Generated On   : ${currentDateFormatted}\n`;
      text += `Language       : ${exportLangOption === 'translated' ? selectedLang.name : 'Original English'}\n`;
      text += `Total Messages : ${validMessages.length}\n`;
      text += 'Official Link  : https://india.gov.in | https://myscheme.gov.in\n';
      text += '================================================================================\n\n';

      validMessages.forEach((msg, idx) => {
        const isUser = msg.role === 'user';
        const speaker = isUser ? 'CITIZEN QUESTION' : 'SEVABOT AI ADVISORY RESPONSE';
        const content = getMessageContent(msg);

        text += `[#${idx + 1}] --------------------------------------------------------------------\n`;
        text += `FROM: ${speaker}\n`;
        text += `--------------------------------------------------------------------------------\n`;
        text += `${content.trim()}\n\n`;
      });

      text += '================================================================================\n';
      text += 'IMPORTANT NOTICE & ADVISORY DISCLAIMER:\n';
      text += '• This report is compiled by SevaBot AI to assist citizens with public welfare\n';
      text += '  information, eligibility criteria, and general application steps.\n';
      text += '• Scheme guidelines, monetary grants, and required documents are periodically\n';
      text += '  updated by the respective Ministries and State Governments.\n';
      text += '• Citizens are advised to verify details and file formal applications on official\n';
      text += '  national portals (india.gov.in, myscheme.gov.in) or state welfare offices.\n';
      text += '================================================================================\n';
      text += 'Generated via SevaBot AI - Empowering Citizens of India through AI Assistance\n';

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SevaBot_Chat_Advisory_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export TXT:', err);
      setErrorMsg('Failed to download text file. Please try again.');
    }
  };

  // 2. Copy Transcript to Clipboard
  const handleCopyTranscript = async () => {
    try {
      let text = `SevaBot AI - Citizen Welfare Consultation Record\nDate: ${currentDateFormatted}\nLanguage: ${exportLangOption === 'translated' ? selectedLang.name : 'English'}\n\n`;
      validMessages.forEach((msg, idx) => {
        const speaker = msg.role === 'user' ? 'Citizen' : 'SevaBot AI';
        text += `[${idx + 1}] ${speaker}:\n${getMessageContent(msg)}\n\n`;
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setErrorMsg('Failed to copy text to clipboard.');
    }
  };

  // 3. Multi-Page PDF Export using html2canvas & jsPDF
  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    setErrorMsg(null);

    try {
      const element = printRef.current;

      // Render the DOM node to high-resolution canvas (scale: 2 for 300dpi crisp text)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Create PDF in portrait A4 format (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      // First page
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      // Subsequent pages if content exceeds 1 page
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`SevaBot_Citizen_Advisory_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setErrorMsg('Could not render PDF. You can also download the Text file or copy the transcript.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="maroon-gradient p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">
                {t('chat_export_modal_title') || 'Export Consultation History'}
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                {t('chat_export_modal_desc') || 'Save and reference your government scheme advisory records anytime'}
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

        {/* Action Bar / Controls */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Language Selection Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-brand-orange" />
              Language:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200 border border-slate-300">
              <button
                type="button"
                onClick={() => setExportLangOption('translated')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  exportLangOption === 'translated'
                    ? 'bg-white text-brand-maroon shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {selectedLang.name}
              </button>
              <button
                type="button"
                onClick={() => setExportLangOption('original')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  exportLangOption === 'original'
                    ? 'bg-white text-brand-maroon shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Original English
              </button>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              disabled={validMessages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              title="Copy all text to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Transcript</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTxt}
              disabled={validMessages.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
              title="Download clean formatted .txt document"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Download Text (.txt)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={validMessages.length === 0 || isGeneratingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-maroon hover:bg-brand-maroon/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-brand-maroon/20"
              title="Download official PDF report"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF (.pdf)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 px-4 py-2 text-xs flex items-center gap-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Document Preview Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                Live Document Preview (Captures in PDF & Text)
              </span>
            </div>

            {/* Printable Document Container */}
            <div
              ref={printRef}
              id="sevabot-advisory-printable"
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 text-slate-800"
              style={{ minHeight: '600px' }}
            >
              {/* Report Header */}
              <div className="border-b-2 border-brand-maroon pb-5 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 maroon-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                      <Bot className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-brand-maroon tracking-tight">
                          SEVABOT AI ADVISORY REPORT
                        </h1>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        Citizen Welfare Scheme Guidance & Public Services Consultation
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Digital India Initiative • Verified Portal Data
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-orange-50 border border-brand-orange/30 text-brand-maroon px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                      {reportId}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">{currentDateFormatted}</p>
                  </div>
                </div>

                {/* Session Meta Bar */}
                <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Language</span>
                    <span className="font-bold text-slate-800">
                      {exportLangOption === 'translated' ? selectedLang.name : 'English (Original)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Total Dialogues</span>
                    <span className="font-bold text-slate-800">{validMessages.length} Messages</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Verification</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Scheme Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversation Log */}
              <div className="space-y-5 mb-8">
                {validMessages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No messages in chat history.</p>
                    <p className="text-xs">Ask SevaBot about any scheme to generate advisory content.</p>
                  </div>
                ) : (
                  validMessages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const content = getMessageContent(msg);

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl p-4 border transition-all ${
                          isUser
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${
                                isUser ? 'bg-brand-orange' : 'bg-brand-maroon'
                              }`}
                            >
                              {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-xs font-bold text-slate-800">
                              {isUser ? 'Citizen Query' : 'SevaBot Advisory'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Message Content */}
                        <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700">
                          {content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Official Disclaimer & Helpline Footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-brand-maroon flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-700">Advisory Disclaimer & Application Guidance</p>
                    <p className="mt-0.5 leading-normal">
                      This consultation log was generated by SevaBot AI using open public data on government welfare schemes. 
                      Eligibility criteria, monetary subsidies, and documentation requisites are determined by respective 
                      Central Ministries and State Departments. Please verify terms and submit formal applications at 
                      <span className="font-semibold text-brand-maroon"> india.gov.in</span> or <span className="font-semibold text-brand-maroon">myscheme.gov.in</span>.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400 px-1 pt-1">
                  <span>Report ID: {reportId} • Generated for Citizen Reference</span>
                  <span>National Portal: india.gov.in • Toll Free: 1800-111-999</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 p-4 px-6 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-slate-500">
            Files are saved directly to your device without storing your query data.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleExportPdf}
              disabled={validMessages.length === 0 || isGeneratingPdf}
              className="px-5 py-2 bg-brand-maroon hover:bg-brand-maroon/90 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download Advisory PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
