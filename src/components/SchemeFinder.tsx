import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  MapPin, 
  Users, 
  Briefcase, 
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Info,
  ShieldCheck,
  Search,
  FileText,
  ListChecks,
  ExternalLink,
  Languages,
  Loader2,
  Clock,
  Bookmark
} from 'lucide-react';
import { cn } from '../lib/utils';
import { translateText } from '../services/gemini';
import { SCHEME_LOCALIZED_DATA } from '../data/schemeTranslations';

interface SchemeFinderProps {
  onClose: () => void;
  onAskSevaBot?: () => void;
  translations: Record<string, string>;
  selectedLang: { code: string; name: string };
  onSelectLang?: (lang: { code: string; name: string }) => void;
  languages?: { code: string; name: string }[];
  onToggleSaveScheme?: (scheme: any) => void;
  isSchemeSaved?: (schemeTitle: string) => boolean;
  onOpenSavedSchemes?: () => void;
  savedSchemesCount?: number;
}

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh"
];

export const REAL_AGE_RANGES = [
  { 
    id: '0-17', 
    min: 0, 
    max: 17, 
    rangeText: '0 - 17 Years', 
    labelKey: 'finder_age_0_17', 
    tagKey: 'finder_age_0_17_label',
    subtext: 'Children & Minors (Education, Nutrition, Girl Child Welfare)'
  },
  { 
    id: '18-25', 
    min: 18, 
    max: 25, 
    rangeText: '18 - 25 Years', 
    labelKey: 'finder_age_18_25', 
    tagKey: 'finder_age_18_25_label',
    subtext: 'Youth & Students (Higher Ed, Skill Training, Apprenticeships)'
  },
  { 
    id: '26-40', 
    min: 26, 
    max: 40, 
    rangeText: '26 - 40 Years', 
    labelKey: 'finder_age_26_40', 
    tagKey: 'finder_age_26_40_label',
    subtext: 'Young Adults & Working (Business Loans, MSME, Housing)'
  },
  { 
    id: '41-59', 
    min: 41, 
    max: 59, 
    rangeText: '41 - 59 Years', 
    labelKey: 'finder_age_41_59', 
    tagKey: 'finder_age_41_59_label',
    subtext: 'Middle-Aged Adults (Agriculture, Health, Micro-Enterprise)'
  },
  { 
    id: '60+', 
    min: 60, 
    max: 120, 
    rangeText: '60+ Years', 
    labelKey: 'finder_age_60_plus', 
    tagKey: 'finder_age_60_plus_label',
    subtext: 'Senior Citizens (Pensions, Geriatric Healthcare, Social Security)'
  }
];

const SCHEME_AGE_BOUNDS: Record<string, { minAge: number; maxAge: number }> = {
  "PM-Kisan Samman Nidhi": { minAge: 18, maxAge: 120 },
  "Post-Matric Scholarship": { minAge: 14, maxAge: 35 },
  "PMEGP Loan Scheme": { minAge: 18, maxAge: 65 },
  "Ayushman Bharat (PM-JAY)": { minAge: 0, maxAge: 120 },
  "Rythu Bandhu": { minAge: 18, maxAge: 120 },
  "Kanya Sumangala Yojana": { minAge: 0, maxAge: 25 },
  "Atal Pension Yojana": { minAge: 18, maxAge: 40 },
  "Pradhan Mantri Awas Yojana (PMAY)": { minAge: 18, maxAge: 85 },
  "Stand-Up India Scheme": { minAge: 18, maxAge: 70 },
  "Mudra Yojana (PMMY)": { minAge: 18, maxAge: 70 },
  "Sukanya Samriddhi Yojana": { minAge: 0, maxAge: 10 },
  "PM SVANidhi": { minAge: 18, maxAge: 75 },
  "National Social Assistance Programme": { minAge: 60, maxAge: 120 },
  "Majhi Ladki Bahin Yojana": { minAge: 21, maxAge: 65 },
  "Gruha Lakshmi Scheme": { minAge: 18, maxAge: 85 },
  "Lakshmir Bhandar": { minAge: 25, maxAge: 60 },
  "Kalaignar Magalir Urimai Thogai": { minAge: 21, maxAge: 65 },
  "Mukhyamantri Ladli Behna Yojana": { minAge: 21, maxAge: 60 },
  "Vahli Dikri Yojana": { minAge: 0, maxAge: 18 },
  "Karunya Health Care Scheme": { minAge: 0, maxAge: 120 },
  "Chiranjeevi Health Insurance": { minAge: 0, maxAge: 120 },
  "KALIA Scheme": { minAge: 18, maxAge: 120 },
  "Mukhyamantri Kanya Utthan Yojana": { minAge: 0, maxAge: 25 }
};

export default function SchemeFinder({ 
  onClose, 
  onAskSevaBot, 
  translations, 
  selectedLang, 
  onSelectLang, 
  languages,
  onToggleSaveScheme,
  isSchemeSaved,
  onOpenSavedSchemes,
  savedSchemesCount = 0
}: SchemeFinderProps) {
  const t = (key: string) => translations[key] || key;

  const STEPS = [
    { id: 1, title: t('finder_step_1'), icon: User },
    { id: 2, title: t('finder_step_2'), icon: MapPin },
    { id: 3, title: t('finder_step_3'), icon: Users },
    { id: 4, title: t('finder_step_minority'), icon: ShieldCheck },
    { id: 5, title: t('finder_step_disability'), icon: Info },
    { id: 6, title: t('finder_step_occupation'), icon: Briefcase },
    { id: 7, title: t('finder_step_economic'), icon: IndianRupee },
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    age: '',
    ageRange: '',
    state: '',
    area: '',
    category: '',
    isMinority: '',
    isDisabled: '',
    occupation: '',
    isBPL: '',
    income: '',
  });
  const [showResults, setShowResults] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    category: '',
    occupation: '',
    type: '',
    ageRange: '',
  });
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [translatedSchemes, setTranslatedSchemes] = useState<Record<string, any>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  const translateAllResults = async () => {
    const results = getMockResults();
    if (selectedLang.code === 'en' || isTranslatingAll || results.length === 0) return;

    setIsTranslatingAll(true);
    try {
      const batchToTranslate = results.map(s => ({
        id: s.title,
        title: s.title,
        desc: s.desc
      }));

      const prompt = `Translate the following list of government scheme titles and descriptions into ${selectedLang.name}. 
      Return the result as a JSON array of objects with the same structure: [{"id": "...", "title": "...", "desc": "..."}].
      Only return the JSON.
      
      DATA: ${JSON.stringify(batchToTranslate)}`;

      const result = await translateText(prompt, "JSON format");
      if (result) {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const translatedBatch = JSON.parse(jsonMatch[0]);
          const newTranslatedSchemes = { ...translatedSchemes };
          
          translatedBatch.forEach((item: any) => {
            const originalScheme = results.find(s => s.title === item.id);
            if (originalScheme) {
              newTranslatedSchemes[`${originalScheme.title}_${selectedLang.code}`] = {
                ...originalScheme,
                title: item.title,
                desc: item.desc,
                isTranslated: true
              };
            }
          });
          
          setTranslatedSchemes(newTranslatedSchemes);
        }
      }
    } catch (error) {
      console.error("Error translating results:", error);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleTranslateScheme = async (scheme: any) => {
    if (selectedLang.code === 'en' || isTranslating) return;
    
    setIsTranslating(true);
    try {
      // Create a simplified object to translate to reduce tokens
      const textToTranslate = JSON.stringify({
        title: scheme.title,
        desc: scheme.desc,
        benefits: scheme.benefits,
        eligibility: scheme.eligibility,
        documents: scheme.documents,
        process: scheme.process
      });

      const prompt = `Translate the following government scheme details into ${selectedLang.name}. 
      Keep the JSON structure exactly as it is. 
      Only return the translated JSON object.
      
      JSON: ${textToTranslate}`;

      // Re-using the translateText but with a specific prompt for JSON
      const result = await translateText(prompt, "JSON format");
      if (result) {
        // Find the JSON block in the response if Gemini wrapped it in markdown
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const translatedData = JSON.parse(jsonMatch[0]);
          setTranslatedSchemes(prev => ({
            ...prev,
            [`${scheme.title}_${selectedLang.code}`]: {
              ...scheme,
              ...translatedData,
              isTranslated: true
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error translating scheme:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (showResults && selectedLang.code !== 'en') {
      translateAllResults();
    }
  }, [showResults, selectedLang.code]);

  const getActiveScheme = (scheme: any) => {
    if (!scheme) return null;
    const key = `${scheme.title}_${selectedLang.code}`;
    if (translatedSchemes[key]) return translatedSchemes[key];

    // Check pre-localized database for this language
    const localized = SCHEME_LOCALIZED_DATA[selectedLang.code]?.[scheme.title];
    if (localized) {
      return {
        ...scheme,
        title: localized.title,
        desc: localized.desc,
        benefits: localized.benefits,
        eligibility: localized.eligibility,
        documents: localized.documents,
        process: localized.process,
        isTranslated: true
      };
    }

    // For other Indic languages, fall back to Hindi translation
    if (selectedLang.code !== 'en' && selectedLang.code !== 'hi') {
      const hiFallback = SCHEME_LOCALIZED_DATA['hi']?.[scheme.title];
      if (hiFallback) {
        return {
          ...scheme,
          title: hiFallback.title,
          desc: hiFallback.desc,
          benefits: hiFallback.benefits,
          eligibility: hiFallback.eligibility,
          documents: hiFallback.documents,
          process: hiFallback.process,
          isTranslated: true
        };
      }
    }

    return scheme;
  };

  const handleAgeRangeSelect = (rangeId: string) => {
    const range = REAL_AGE_RANGES.find(r => r.id === rangeId);
    if (!range) return;
    setFormData(prev => {
      const currentNum = prev.age !== '' ? Number(prev.age) : NaN;
      const isAlreadyInRange = !isNaN(currentNum) && currentNum >= range.min && currentNum <= range.max;
      return {
        ...prev,
        ageRange: rangeId,
        age: isAlreadyInRange 
          ? prev.age 
          : (range.id === '0-17' ? '12' : range.id === '18-25' ? '21' : range.id === '26-40' ? '30' : range.id === '41-59' ? '48' : '65')
      };
    });
  };

  const handleExactAgeChange = (val: string) => {
    if (val === '') {
      setFormData(prev => ({ ...prev, age: '', ageRange: '' }));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const matchedRange = REAL_AGE_RANGES.find(r => num >= r.min && num <= r.max);
    setFormData(prev => ({
      ...prev,
      age: val,
      ageRange: matchedRange ? matchedRange.id : ''
    }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (formData.age && !isNaN(Number(formData.age))) {
        const num = Number(formData.age);
        if (num < 0 || num > 110) {
          return;
        }
      }
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      setActiveFilters({
        category: formData.category,
        occupation: formData.occupation,
        type: '',
        ageRange: formData.ageRange || '',
      });
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_basic_details_title')}</h3>
              <p className="text-slate-500">{t('finder_basic_details_desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_gender')}</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Male', label: t('finder_male') },
                  { id: 'Female', label: t('finder_female') },
                  { id: 'Other', label: t('finder_other') }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => updateForm('gender', g.id)}
                    className={cn(
                      "py-4 px-4 rounded-2xl border-2 transition-all font-bold flex flex-col items-center justify-center gap-3 group",
                      formData.gender === g.id 
                        ? "border-brand-orange bg-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                        : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                      formData.gender === g.id ? "bg-white/20" : "bg-slate-50 group-hover:bg-brand-orange/10"
                    )}>
                      <User className={cn("w-6 h-6", formData.gender === g.id ? "text-white" : "text-slate-400")} />
                    </div>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                  {t('finder_age_range') || 'Age Range'}
                </label>
                <span className="text-xs font-semibold text-slate-400">
                  {t('finder_age_valid_range_hint') || 'Real human age: 0 to 110 years'}
                </span>
              </div>

              {/* Real Age Ranges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {REAL_AGE_RANGES.map(range => {
                  const isSelected = formData.ageRange === range.id;
                  return (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => handleAgeRangeSelect(range.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between gap-2.5 group relative overflow-hidden",
                        isSelected
                          ? "border-brand-orange bg-brand-orange text-white shadow-lg shadow-brand-orange/20"
                          : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base font-black">
                          {t(range.labelKey) || range.rangeText}
                        </span>
                        <span className={cn(
                          "px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full tracking-wider",
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-brand-orange/10 group-hover:text-brand-orange"
                        )}>
                          {t(range.tagKey) || range.id}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs leading-relaxed font-medium line-clamp-2",
                        isSelected ? "text-white/90" : "text-slate-400"
                      )}>
                        {range.subtext}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Exact Age Input with Real-Age Validation */}
              <div className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                      {t('finder_age_exact_title') || 'Or specify exact age (Years)'}
                    </label>
                    <p className="text-xs text-slate-400">
                      Entering an exact age automatically matches the real age range above
                    </p>
                  </div>
                  <div className="relative w-full sm:w-44">
                    <input
                      type="number"
                      min="0"
                      max="110"
                      value={formData.age}
                      onChange={(e) => handleExactAgeChange(e.target.value)}
                      placeholder="e.g. 24"
                      className={cn(
                        "w-full py-3 px-4 pr-12 bg-white border-2 rounded-xl outline-none transition-all text-base font-bold text-slate-800",
                        formData.age !== '' && (Number(formData.age) < 0 || Number(formData.age) > 110)
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                          : "border-slate-200 focus:border-brand-orange"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                      {t('finder_years')}
                    </div>
                  </div>
                </div>

                {formData.age !== '' && (Number(formData.age) < 0 || Number(formData.age) > 110) && (
                  <p className="text-xs font-bold text-rose-500 mt-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    {t('finder_age_invalid_error') || 'Please enter a realistic age between 0 and 110 years.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_location_title')}</h3>
              <p className="text-slate-500">{t('finder_location_desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_state')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 custom-scrollbar">
                {STATES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateForm('state', s)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-sm font-bold transition-all text-left truncate",
                      formData.state === s
                        ? "border-brand-orange bg-brand-orange text-white shadow-md shadow-brand-orange/20"
                        : "border-white bg-white text-slate-600 hover:border-brand-orange/30"
                    )}
                  >
                    {t('state_' + s.toLowerCase().replace(/ /g, '_').replace(/&/g, '')) || s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_area')}</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'Urban', label: t('finder_urban') },
                  { id: 'Rural', label: t('finder_rural') }
                ].map(a => (
                  <button
                    key={a.id}
                    onClick={() => updateForm('area', a.id)}
                    className={cn(
                      "py-5 px-4 rounded-2xl border-2 transition-all font-bold flex items-center justify-center gap-3",
                      formData.area === a.id 
                        ? "border-brand-orange bg-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                        : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                    )}
                  >
                    <MapPin className={cn("w-5 h-5", formData.area === a.id ? "text-white" : "text-slate-400")} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_social_category_title')}</h3>
              <p className="text-slate-500">{t('finder_social_category_desc')}</p>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_category')}</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'General', label: t('finder_general') },
                  { id: 'OBC', label: t('finder_obc') },
                  { id: 'SC', label: t('finder_sc') },
                  { id: 'ST', label: t('finder_st') }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => updateForm('category', c.id)}
                    className={cn(
                      "py-5 px-4 rounded-2xl border-2 transition-all font-bold flex items-center justify-center gap-3",
                      formData.category === c.id 
                        ? "border-brand-orange bg-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                        : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                    )}
                  >
                    <Users className={cn("w-5 h-5", formData.category === c.id ? "text-white" : "text-slate-400")} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_minority_status_title')}</h3>
              <p className="text-slate-500">{t('finder_minority_status_desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'Yes', label: t('finder_yes') },
                { id: 'No', label: t('finder_no') }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateForm('isMinority', opt.id)}
                  className={cn(
                    "py-8 px-4 rounded-3xl border-2 transition-all font-black text-xl flex flex-col items-center gap-4",
                    formData.isMinority === opt.id 
                      ? "border-brand-orange bg-brand-orange text-white shadow-xl shadow-brand-orange/20" 
                      : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    formData.isMinority === opt.id ? "bg-white/20" : "bg-slate-50"
                  )}>
                    <ShieldCheck className={cn("w-8 h-8", formData.isMinority === opt.id ? "text-white" : "text-slate-400")} />
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_disability_status_title')}</h3>
              <p className="text-slate-500">{t('finder_disability_status_desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'Yes', label: t('finder_yes') },
                { id: 'No', label: t('finder_no') }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateForm('isDisabled', opt.id)}
                  className={cn(
                    "py-8 px-4 rounded-3xl border-2 transition-all font-black text-xl flex flex-col items-center gap-4",
                    formData.isDisabled === opt.id 
                      ? "border-brand-orange bg-brand-orange text-white shadow-xl shadow-brand-orange/20" 
                      : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    formData.isDisabled === opt.id ? "bg-white/20" : "bg-slate-50"
                  )}>
                    <Info className={cn("w-8 h-8", formData.isDisabled === opt.id ? "text-white" : "text-slate-400")} />
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_occupation_title')}</h3>
              <p className="text-slate-500">{t('finder_occupation_desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'Student', label: t('finder_student') },
                { id: 'Farmer', label: t('finder_farmer') },
                { id: 'Entrepreneur', label: t('finder_entrepreneur') },
                { id: 'Unemployed', label: t('finder_unemployed') },
                { id: 'Self Employed', label: t('finder_self_employed') },
                { id: 'Government Employee', label: t('finder_govt_employee') }
              ].map(o => (
                <button
                  key={o.id}
                  onClick={() => updateForm('occupation', o.id)}
                  className={cn(
                    "py-5 px-4 rounded-2xl border-2 transition-all font-bold text-sm text-left flex items-center gap-4",
                    formData.occupation === o.id 
                      ? "border-brand-orange bg-brand-orange text-white shadow-lg shadow-brand-orange/20" 
                      : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                  )}
                >
                  <Briefcase className={cn("w-5 h-5 shrink-0", formData.occupation === o.id ? "text-white" : "text-slate-400")} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('finder_economic_status_title')}</h3>
              <p className="text-slate-500">{t('finder_economic_status_desc')}</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_bpl_question')}</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'Yes', label: t('finder_yes') },
                    { id: 'No', label: t('finder_no') }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateForm('isBPL', opt.id)}
                      className={cn(
                        "py-4 px-4 rounded-2xl border-2 transition-all font-bold flex items-center justify-center gap-3",
                        formData.isBPL === opt.id 
                          ? "border-brand-orange bg-brand-orange text-white shadow-md shadow-brand-orange/20" 
                          : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">{t('finder_income')}</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Up to ₹50,000', label: t('finder_income_range_1') },
                    { id: '₹50,001 - ₹1,00,000', label: t('finder_income_range_2') },
                    { id: '₹1,00,001 - ₹2,50,000', label: t('finder_income_range_3') },
                    { id: '₹2,50,001 - ₹5,00,000', label: t('finder_income_range_4') },
                    { id: 'Above ₹5,00,000', label: t('finder_income_range_5') }
                  ].map(i => (
                    <button
                      key={i.id}
                      onClick={() => updateForm('income', i.id)}
                      className={cn(
                        "py-4 px-6 rounded-2xl border-2 transition-all font-bold text-left flex items-center justify-between group",
                        formData.income === i.id 
                          ? "border-brand-orange bg-brand-orange text-white shadow-md shadow-brand-orange/20" 
                          : "border-slate-100 bg-white hover:border-brand-orange/30 text-slate-600"
                      )}
                    >
                      {i.label}
                      <ChevronRight className={cn("w-5 h-5 transition-transform group-hover:translate-x-1", formData.income === i.id ? "text-white" : "text-slate-300")} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getMockResults = () => {
    const allSchemes = [
      {
        title: "PM-Kisan Samman Nidhi",
        category: "Agriculture",
        type: "Central",
        desc: "Income support of ₹6,000 per year in three equal installments to all landholding farmer families.",
        benefits: [
          "Direct income support of ₹6,000 per year",
          "Paid in three equal installments of ₹2,000 each",
          "Direct Benefit Transfer (DBT) to bank accounts"
        ],
        eligibility: [
          "All landholding farmer families are eligible",
          "The family includes husband, wife, and minor children",
          "State/UT governments identify the eligible families"
        ],
        documents: [
          "Aadhaar Card (Mandatory)",
          "Landholding papers/records",
          "Bank Account Details",
          "Mobile Number"
        ],
        process: [
          "Farmers can register through PM-Kisan portal",
          "Common Service Centres (CSCs) can also facilitate registration",
          "Self-registration via mobile app is available"
        ],
        officialUrl: "https://pmkisan.gov.in/",
        tags: ["Farmer", "Direct Benefit"],
        allowedOccupations: ["Farmer"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"]
      },
      {
        title: "Post-Matric Scholarship",
        category: "Education",
        type: "Central",
        desc: "Financial assistance to students belonging to SC/ST/OBC categories for pursuing higher education.",
        benefits: [
          "Maintenance allowance for students",
          "Reimbursement of non-refundable compulsory fees",
          "Book bank facility for specified courses"
        ],
        eligibility: [
          "Student must belong to SC, ST, or OBC category",
          "Family income must be below specified threshold (e.g., ₹2.5 Lakh for SC/ST)",
          "Must be pursuing post-matriculation courses in recognized institutions"
        ],
        documents: [
          "Caste Certificate",
          "Income Certificate",
          "Previous Year Marksheet",
          "Fee Receipt of current course",
          "Bank Passbook"
        ],
        process: [
          "Apply through National Scholarship Portal (NSP)",
          "Verification by the educational institution",
          "Final approval by the state/central department"
        ],
        officialUrl: "https://scholarships.gov.in/",
        tags: ["Student", "Scholarship"],
        allowedOccupations: ["Student"],
        allowedCategories: ["OBC", "SC", "ST"],
        states: ["All"]
      },
      {
        title: "PMEGP Loan Scheme",
        category: "Business",
        type: "Central",
        desc: "Credit-linked subsidy program for setting up new micro-enterprises in non-farm sector.",
        benefits: [
          "Subsidy of 15% to 35% on project cost",
          "Loans up to ₹50 Lakh for manufacturing units",
          "Loans up to ₹20 Lakh for service units"
        ],
        eligibility: [
          "Any individual above 18 years of age",
          "At least VIII standard pass for projects above ₹10 Lakh (mfg) or ₹5 Lakh (service)",
          "Self Help Groups, Institutions registered under Societies Registration Act"
        ],
        documents: [
          "Aadhaar Card",
          "Project Report",
          "Educational Qualification Certificate",
          "Caste/Category Certificate (if applicable)"
        ],
        process: [
          "Apply online through KVIC portal",
          "Submit project proposal and required documents",
          "Interview by District Level Task Force Committee (DLTFC)"
        ],
        officialUrl: "https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp",
        tags: ["Entrepreneur", "Loan"],
        allowedOccupations: ["Entrepreneur", "Self Employed", "Unemployed"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"]
      },
      {
        title: "Ayushman Bharat (PM-JAY)",
        category: "Healthcare",
        type: "Central",
        desc: "Health cover of ₹5 Lakh per family per year for secondary and tertiary care hospitalization.",
        benefits: [
          "Health coverage of up to ₹5 Lakh per family per year",
          "Cashless and paperless access to health services",
          "Covers pre-existing diseases from day one"
        ],
        eligibility: [
          "Families listed in the SECC 2011 database",
          "Low-income families in rural and urban areas",
          "No cap on family size or age"
        ],
        documents: [
          "Aadhaar Card",
          "Ration Card",
          "PM-JAY ID/Letter",
          "Mobile Number"
        ],
        process: [
          "Check eligibility on official PM-JAY website",
          "Visit any empanelled hospital (public or private)",
          "Contact Ayushman Mitra at the hospital for assistance"
        ],
        officialUrl: "https://nha.gov.in/PM-JAY",
        tags: ["All", "Health"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"]
      },
      {
        title: "Rythu Bandhu",
        category: "Agriculture",
        type: "State",
        desc: "Investment support for agriculture and horticulture crops to farmers in Telangana.",
        benefits: [
          "Financial assistance of ₹5,000 per acre per season",
          "Support for two seasons (Kharif and Rabi) annually",
          "Direct credit to farmers' bank accounts"
        ],
        eligibility: [
          "Pattadar farmers in Telangana state",
          "Owners of agriculture and horticulture land",
          "No restriction on the extent of landholding"
        ],
        documents: [
          "Pattadar Passbook",
          "Aadhaar Card",
          "Bank Account Details",
          "Voter ID Card"
        ],
        process: [
          "Identification of farmers by the Agriculture Department",
          "Verification of land records through Dharani portal",
          "Automatic disbursement to verified accounts"
        ],
        officialUrl: "http://rythubandhu.telangana.gov.in/",
        tags: ["Farmer", "Telangana"],
        allowedOccupations: ["Farmer"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Telangana"]
      },
      {
        title: "Kanya Sumangala Yojana",
        category: "Women Welfare",
        type: "State",
        desc: "Financial assistance for girls in Uttar Pradesh from birth to higher education.",
        benefits: [
          "Total assistance of ₹15,000 in six stages",
          "Covers birth, vaccination, school admission, and higher education",
          "Direct transfer to the guardian's bank account"
        ],
        eligibility: [
          "Resident of Uttar Pradesh",
          "Family income should not exceed ₹3 Lakh per annum",
          "Maximum of two girls per family"
        ],
        documents: [
          "Aadhaar Card of girl and parents",
          "Birth Certificate",
          "Income Certificate",
          "Residence Proof",
          "Bank Passbook"
        ],
        process: [
          "Register on the official Kanya Sumangala portal",
          "Fill application form for the relevant stage",
          "Upload required documents and submit"
        ],
        tags: ["Female", "UP"],
        allowedOccupations: ["Student", "All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Uttar Pradesh"],
        officialUrl: "https://skp.up.gov.in/"
      },
      {
        title: "Atal Pension Yojana",
        category: "Social Welfare",
        type: "Central",
        desc: "Pension scheme for citizens in the unorganized sector, providing a guaranteed minimum pension.",
        benefits: [
          "Guaranteed minimum pension of ₹1,000 to ₹5,000 per month",
          "Pension starts after the age of 60",
          "In case of death, spouse receives the same pension"
        ],
        eligibility: [
          "Indian citizen aged between 18 and 40 years",
          "Must have a savings bank account",
          "Should not be a member of any statutory social security scheme"
        ],
        documents: [
          "Aadhaar Card",
          "Bank Account Details",
          "Mobile Number",
          "Nominee Details"
        ],
        process: [
          "Visit any bank or post office where you have an account",
          "Fill the APY registration form",
          "Ensure sufficient balance for monthly/quarterly contributions"
        ],
        tags: ["Pension", "Unorganized Sector"],
        allowedOccupations: ["Self Employed", "Unemployed", "Farmer"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://npscra.nsdl.co.in/scheme-details.php"
      },
      {
        title: "Pradhan Mantri Awas Yojana (PMAY)",
        category: "Housing",
        type: "Central",
        desc: "Affordable housing for the urban and rural poor with interest subsidies on home loans.",
        benefits: [
          "Interest subsidy up to 6.5% on home loans",
          "Financial assistance for construction of new houses",
          "Preference to women, SC/ST, and differently-abled"
        ],
        eligibility: [
          "Families with annual income up to ₹18 Lakh (depending on category)",
          "Beneficiary family should not own a pucca house anywhere in India",
          "Aadhaar card is mandatory for all family members"
        ],
        documents: [
          "Aadhaar Card",
          "Income Proof/Certificate",
          "Address Proof",
          "Bank Account Details",
          "Affidavit stating no other pucca house"
        ],
        process: [
          "Apply online through PMAY portal or at CSCs",
          "Submit application through banks/HFCs for credit-linked subsidy",
          "Verification by local authorities"
        ],
        tags: ["Housing", "Subsidy"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://pmay-urban.gov.in/"
      },
      {
        title: "Stand-Up India Scheme",
        category: "Business",
        type: "Central",
        desc: "Facilitates bank loans between ₹10 lakh and ₹1 crore to at least one SC or ST borrower and at least one woman borrower per bank branch.",
        benefits: [
          "Bank loans from ₹10 Lakh to ₹1 Crore",
          "Composite loan (inclusive of term loan and working capital)",
          "Repayment period of up to 7 years"
        ],
        eligibility: [
          "SC/ST and/or women entrepreneurs above 18 years",
          "Loans only for greenfield projects (first time venture)",
          "Borrower should not be in default to any bank/financial institution"
        ],
        documents: [
          "Aadhaar Card/Voter ID",
          "Caste Certificate (for SC/ST)",
          "Business Address Proof",
          "Project Report",
          "Passport size photographs"
        ],
        process: [
          "Apply directly at bank branches",
          "Apply through Stand-Up India portal",
          "Apply through Lead District Manager (LDM)"
        ],
        tags: ["Entrepreneur", "SC/ST", "Women"],
        allowedOccupations: ["Entrepreneur"],
        allowedCategories: ["SC", "ST"],
        states: ["All"],
        officialUrl: "https://www.standupmitra.in/"
      },
      {
        title: "Mudra Yojana (PMMY)",
        category: "Business",
        type: "Central",
        desc: "Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises.",
        benefits: [
          "Loans up to ₹10 Lakh without collateral",
          "Three categories: Shishu (up to ₹50k), Kishore (up to ₹5L), Tarun (up to ₹10L)",
          "Mudra Card for working capital needs"
        ],
        eligibility: [
          "Any Indian citizen who has a business plan for non-farm income generating activity",
          "Micro-units, small businesses, shopkeepers, fruit/vegetable vendors",
          "Truck operators, food-service units, repair shops"
        ],
        documents: [
          "Mudra Application Form",
          "Identity and Address Proof",
          "Business Identity/Address Proof",
          "Project Report/Business Plan",
          "Photographs"
        ],
        process: [
          "Approach any commercial bank, RRB, or MFI",
          "Submit the Mudra loan application with required documents",
          "Sanction and disbursement as per bank's norms"
        ],
        tags: ["Business", "Micro-finance"],
        allowedOccupations: ["Entrepreneur", "Self Employed"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://www.mudra.org.in/"
      },
      {
        title: "Sukanya Samriddhi Yojana",
        category: "Social Welfare",
        type: "Central",
        desc: "A small deposit scheme for the girl child as part of the 'Beti Bachao Beti Padhao' campaign.",
        benefits: [
          "High interest rate compared to other savings schemes",
          "Tax benefits under Section 80C",
          "Maturity amount is tax-free"
        ],
        eligibility: [
          "Account can be opened by parents/guardians for a girl child",
          "Girl child must be below 10 years of age",
          "Only one account per girl child (max 2 per family)"
        ],
        documents: [
          "Birth Certificate of the girl child",
          "Aadhaar Card of parent/guardian",
          "Address Proof",
          "Photographs"
        ],
        process: [
          "Open account at any post office or authorized bank branch",
          "Submit application form with initial deposit (min ₹250)",
          "Regular deposits can be made until the girl reaches 15 years"
        ],
        tags: ["Girl Child", "Savings"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://www.nsiindia.gov.in/InternalPage.aspx?Id_Ms=23"
      },
      {
        title: "PM SVANidhi",
        category: "Business",
        type: "Central",
        desc: "Special micro-credit facility for street vendors to resume their livelihoods.",
        benefits: [
          "Initial working capital loan up to ₹10,000",
          "Interest subsidy of 7% on timely repayment",
          "Cashback incentives on digital transactions"
        ],
        eligibility: [
          "Street vendors/hawkers in urban areas",
          "Vendors in possession of Certificate of Vending/Identity Card",
          "Vendors left out of ULB-led identification survey"
        ],
        documents: [
          "Aadhaar Card",
          "Voter ID/Driving License",
          "Certificate of Vending",
          "Mobile number linked with Aadhaar"
        ],
        process: [
          "Apply through PM SVANidhi portal or mobile app",
          "Common Service Centres (CSCs) can assist in application",
          "Direct disbursement to bank account after verification"
        ],
        tags: ["Street Vendors", "Loan"],
        allowedOccupations: ["Self Employed"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://pmsvanidhi.mohua.gov.in/"
      },
      {
        title: "National Social Assistance Programme",
        category: "Social Welfare",
        type: "Central",
        desc: "Provides financial assistance to the elderly, widows and persons with disabilities in the form of social pensions.",
        benefits: [
          "Monthly pension for BPL citizens",
          "Covers IGNOAPS (Elderly), IGNWPS (Widows), IGNDPS (Disabled)",
          "Assistance for funeral expenses (NFBS)"
        ],
        eligibility: [
          "Must belong to a Below Poverty Line (BPL) household",
          "Elderly: 60+ years, Widows: 40-79 years, Disabled: 18-79 years (80%+ disability)",
          "Criteria as defined by the Central/State government"
        ],
        documents: [
          "BPL Card",
          "Aadhaar Card",
          "Age Proof/Birth Certificate",
          "Disability Certificate (if applicable)",
          "Death Certificate of spouse (for widows)"
        ],
        process: [
          "Apply through the local Gram Panchayat or Municipality",
          "Submit application to the Social Welfare Department",
          "Verification by the designated officer"
        ],
        tags: ["Senior Citizen", "Widow", "Disabled"],
        allowedOccupations: ["Unemployed", "All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["All"],
        officialUrl: "https://nsap.nic.in/"
      },
      {
        title: "Majhi Ladki Bahin Yojana",
        category: "Women Welfare",
        type: "State",
        desc: "Financial assistance of ₹1,500 per month to eligible women in Maharashtra.",
        benefits: [
          "Monthly financial assistance of ₹1,500",
          "Direct Benefit Transfer (DBT) to bank accounts",
          "Empowerment and financial independence for women"
        ],
        eligibility: [
          "Resident of Maharashtra",
          "Women aged between 21 and 65 years",
          "Family income should be less than ₹2.5 Lakh per annum"
        ],
        documents: [
          "Aadhaar Card",
          "Domicile Certificate/Ration Card",
          "Income Certificate",
          "Bank Passbook",
          "Photograph"
        ],
        process: [
          "Apply through the Nari Shakti Doot app",
          "Submit application at Setu Suvidha Kendra or Anganwadi centers",
          "Verification by local authorities"
        ],
        tags: ["Female", "Maharashtra"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Maharashtra"],
        officialUrl: "https://ladlibahin.maharashtra.gov.in/"
      },
      {
        title: "Gruha Lakshmi Scheme",
        category: "Women Welfare",
        type: "State",
        desc: "Monthly assistance of ₹2,000 to the woman head of the family in Karnataka.",
        benefits: [
          "Monthly cash assistance of ₹2,000",
          "Financial support for household expenses",
          "Direct transfer to the head of the family's account"
        ],
        eligibility: [
          "Resident of Karnataka",
          "Woman head of the family (as identified in Ration Card)",
          "Applicable for BPL, APL, and Antyodaya card holders"
        ],
        documents: [
          "Aadhaar Card",
          "Ration Card (BPL/APL/Antyodaya)",
          "Bank Account Details",
          "Mobile Number"
        ],
        process: [
          "Register on Seva Sindhu portal or at Karnataka One/Gram One centers",
          "Submit application with required details",
          "Verification and approval by the department"
        ],
        tags: ["Female", "Karnataka"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Karnataka"],
        officialUrl: "https://sevasindhu.karnataka.gov.in/"
      },
      {
        title: "Lakshmir Bhandar",
        category: "Social Welfare",
        type: "State",
        desc: "Financial support to women heads of households in West Bengal.",
        benefits: [
          "Monthly assistance of ₹1,000 for General category",
          "Monthly assistance of ₹1,200 for SC/ST categories",
          "Direct credit to bank accounts"
        ],
        eligibility: [
          "Resident of West Bengal",
          "Women aged between 25 and 60 years",
          "Should not be a permanent government employee"
        ],
        documents: [
          "Swastha Sathi Card",
          "Aadhaar Card",
          "Caste Certificate (for SC/ST)",
          "Bank Passbook",
          "Photograph"
        ],
        process: [
          "Apply during Duare Sarkar camps",
          "Submit the application form with required documents",
          "Verification by the block/municipality level officers"
        ],
        tags: ["Female", "West Bengal"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["West Bengal"],
        officialUrl: "https://socialsecurity.wb.gov.in/"
      },
      {
        title: "Kalaignar Magalir Urimai Thogai",
        category: "Women Welfare",
        type: "State",
        desc: "Monthly rights grant of ₹1,000 for women heads of families in Tamil Nadu.",
        benefits: [
          "Monthly financial grant of ₹1,000",
          "Support for women's livelihood and dignity",
          "Direct transfer to bank accounts"
        ],
        eligibility: [
          "Resident of Tamil Nadu",
          "Women aged above 21 years",
          "Family income below ₹2.5 Lakh per annum",
          "Electricity consumption below 3,600 units per year"
        ],
        documents: [
          "Aadhaar Card",
          "Ration Card (Smart Card)",
          "Bank Passbook",
          "Electricity Bill"
        ],
        process: [
          "Apply through special camps organized by the government",
          "Submit application form with biometric authentication",
          "Field verification by designated teams"
        ],
        tags: ["Female", "Tamil Nadu"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Tamil Nadu"],
        officialUrl: "https://www.tn.gov.in/scheme/data_view/100001"
      },
      {
        title: "Mukhyamantri Ladli Behna Yojana",
        category: "Women Welfare",
        type: "State",
        desc: "Financial empowerment scheme for women in Madhya Pradesh.",
        benefits: [
          "Monthly financial assistance of ₹1,250",
          "Direct Benefit Transfer to bank accounts",
          "Improvement in health and nutrition of women and children"
        ],
        eligibility: [
          "Resident of Madhya Pradesh",
          "Married women (including widows, divorced, abandoned) aged 21-60 years",
          "Family income less than ₹2.5 Lakh per annum"
        ],
        documents: [
          "Samagra ID",
          "Aadhaar Card",
          "Bank Account linked with Aadhaar and DBT enabled",
          "Mobile Number"
        ],
        process: [
          "Apply through the Ladli Behna portal or at local camps",
          "Submit application with e-KYC",
          "Verification and final list publication"
        ],
        tags: ["Female", "Madhya Pradesh"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Madhya Pradesh"],
        officialUrl: "https://cmladlibehna.mp.gov.in/"
      },
      {
        title: "Vahli Dikri Yojana",
        category: "Education",
        type: "State",
        desc: "Financial assistance for the birth and education of girl children in Gujarat.",
        benefits: [
          "Financial assistance of ₹4,000 on admission to Class 1",
          "Financial assistance of ₹6,000 on admission to Class 9",
          "Financial assistance of ₹1 Lakh on attaining 18 years for higher education/marriage"
        ],
        eligibility: [
          "Resident of Gujarat",
          "Family income should be less than ₹2 Lakh per annum",
          "Maximum of two girl children per family"
        ],
        documents: [
          "Birth Certificate of girl child",
          "Aadhaar Card of parents",
          "Income Certificate",
          "Domicile Certificate",
          "Bank Passbook"
        ],
        process: [
          "Apply through the Women and Child Development Department portal",
          "Submit application at local Anganwadi or ICDS office",
          "Verification by the District Social Welfare Officer"
        ],
        tags: ["Girl Child", "Gujarat"],
        allowedOccupations: ["Student", "All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Gujarat"],
        officialUrl: "https://wcd.gujarat.gov.in/vahli-dikri-yojana"
      },
      {
        title: "Karunya Health Care Scheme",
        category: "Healthcare",
        type: "State",
        desc: "Comprehensive health insurance scheme for the poor in Kerala.",
        benefits: [
          "Cashless treatment for serious ailments",
          "Coverage for major surgeries and treatments",
          "Financial assistance up to ₹2 Lakh per family"
        ],
        eligibility: [
          "Resident of Kerala",
          "Families with annual income below ₹3 Lakh",
          "Preference to BPL families and those with chronic illnesses"
        ],
        documents: [
          "Aadhaar Card",
          "Ration Card",
          "Income Certificate",
          "Medical records/certificates for chronic illness"
        ],
        process: [
          "Register at empanelled hospitals or Akshaya centers",
          "Submit application with required documents",
          "Verification by the Karunya Benevolent Fund authorities"
        ],
        tags: ["Health", "Kerala"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Kerala"],
        officialUrl: "https://karunya.kerala.gov.in/"
      },
      {
        title: "Chiranjeevi Health Insurance",
        category: "Healthcare",
        type: "State",
        desc: "Cashless medical facility for all families in Rajasthan.",
        benefits: [
          "Cashless health insurance cover up to ₹25 Lakh per family",
          "Covers secondary and tertiary care hospitalization",
          "Includes pre and post-hospitalization expenses"
        ],
        eligibility: [
          "All families residing in Rajasthan",
          "Free for NFSA, SECC, and small/marginal farmers",
          "Other families can join by paying a nominal premium of ₹850 per year"
        ],
        documents: [
          "Jan Aadhaar Card/Aadhaar Card",
          "Ration Card",
          "Mobile Number"
        ],
        process: [
          "Register online through the Chiranjeevi portal or SSO ID",
          "Visit any empanelled public or private hospital",
          "Show Jan Aadhaar card for cashless treatment"
        ],
        tags: ["Health", "Rajasthan"],
        allowedOccupations: ["All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Rajasthan"],
        officialUrl: "https://chiranjeevi.rajasthan.gov.in/"
      },
      {
        title: "KALIA Scheme",
        category: "Agriculture",
        type: "State",
        desc: "Livelihood and income augmentation for farmers in Odisha.",
        benefits: [
          "Financial assistance of ₹10,000 per family per year",
          "Interest-free crop loans up to ₹50,000",
          "Life insurance and accident insurance cover"
        ],
        eligibility: [
          "Small and marginal farmers in Odisha",
          "Landless agricultural households",
          "Vulnerable cultivators and landless laborers"
        ],
        documents: [
          "Aadhaar Card",
          "Bank Account Details",
          "Land records/Pattas",
          "Voter ID"
        ],
        process: [
          "Identification of beneficiaries by the state government",
          "Verification through the KALIA portal",
          "Direct credit to bank accounts"
        ],
        tags: ["Farmer", "Odisha"],
        allowedOccupations: ["Farmer"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Odisha"],
        officialUrl: "https://kalia.odisha.gov.in/"
      },
      {
        title: "Mukhyamantri Kanya Utthan Yojana",
        category: "Education",
        type: "State",
        desc: "Financial assistance for girls' education from birth to graduation in Bihar.",
        benefits: [
          "Assistance of ₹50,000 for girls from birth to graduation",
          "Incentives for completing Class 10, 12, and Graduation",
          "Support for health, nutrition, and education"
        ],
        eligibility: [
          "Resident of Bihar",
          "Unmarried girl child (for school/college level incentives)",
          "Applicable for all girl children regardless of category"
        ],
        documents: [
          "Birth Certificate",
          "Aadhaar Card of girl and parents",
          "Marksheets of Class 10/12/Graduation",
          "Bank Passbook"
        ],
        process: [
          "Apply through the official MKUY portal",
          "Submit application for each stage (birth, education milestones)",
          "Verification by the Education/Social Welfare Department"
        ],
        tags: ["Female", "Bihar"],
        allowedOccupations: ["Student", "All"],
        allowedCategories: ["General", "OBC", "SC", "ST"],
        states: ["Bihar"],
        officialUrl: "https://edudbt.bih.nic.in/"
      }
    ];

    const schemesWithAge = allSchemes.map(s => {
      const bounds = SCHEME_AGE_BOUNDS[s.title] || { minAge: 0, maxAge: 120 };
      return {
        ...s,
        minAge: bounds.minAge,
        maxAge: bounds.maxAge
      };
    });

    return schemesWithAge.filter(scheme => {
      // Filter by Occupation
      const matchesOccupation = activeFilters.occupation === '' || 
        scheme.allowedOccupations.includes("All") ||
        scheme.allowedOccupations.includes(activeFilters.occupation);

      // Filter by Category
      const matchesCategory = activeFilters.category === '' || 
        scheme.allowedCategories.includes(activeFilters.category);

      // Filter by State
      const matchesState = formData.state === '' ||
        scheme.states.includes("All") ||
        scheme.states.includes(formData.state);

      // Filter by Type (Central/State)
      const matchesType = activeFilters.type === '' || 
        scheme.type === activeFilters.type;

      // Filter by Age Range / Exact Age
      let matchesAge = true;
      const effectiveAgeRange = activeFilters.ageRange || formData.ageRange;

      if (effectiveAgeRange) {
        const rangeDef = REAL_AGE_RANGES.find(r => r.id === effectiveAgeRange);
        if (rangeDef) {
          matchesAge = rangeDef.max >= scheme.minAge && rangeDef.min <= scheme.maxAge;
        }
      } else if (formData.age !== '' && !isNaN(Number(formData.age))) {
        const userAge = Number(formData.age);
        matchesAge = userAge >= scheme.minAge && userAge <= scheme.maxAge;
      }

      return matchesOccupation && matchesCategory && matchesState && matchesType && matchesAge;
    });
  };

  const toggleFilter = (type: 'category' | 'occupation' | 'type' | 'ageRange', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? '' : value
    }));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Official-style Header */}
      <header className="bg-[#1a3a5f] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <div className="h-10 w-[2px] bg-white/20 hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                {showResults ? t('finder_eligible_schemes') : t('finder_check_eligibility')}
              </h1>
              <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3 text-green-400" />
                {t('finder_official_source')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {onSelectLang && languages && (
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/20 transition-colors">
                <Languages className="w-4 h-4 text-brand-orange" />
                <select
                  aria-label="Select Language"
                  value={selectedLang.code}
                  onChange={(e) => {
                    const found = languages.find(l => l.code === e.target.value);
                    if (found) onSelectLang(found);
                  }}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-1"
                >
                  {languages.map(l => (
                    <option key={l.code} value={l.code} className="text-slate-900 font-sans">
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onOpenSavedSchemes && (
              <button
                onClick={onOpenSavedSchemes}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold transition-colors"
                title="View Bookmarked Schemes"
              >
                <Bookmark className="w-3.5 h-3.5 text-brand-orange" />
                <span className="hidden sm:inline">Saved</span>
                {savedSchemesCount > 0 && (
                  <span className="bg-brand-orange text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {savedSchemesCount}
                  </span>
                )}
              </button>
            )}

            {!showResults && (
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">{t('finder_progress')}</div>
                  <div className="text-lg font-black">{Math.round((currentStep / STEPS.length) * 100)}%</div>
                </div>
                <div className="w-32 h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-brand-orange"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {showResults && (
              <button 
                onClick={() => {
                  setShowResults(false);
                  setCurrentStep(1);
                }}
                className="px-5 py-2 bg-brand-orange text-white rounded-full font-black text-sm hover:bg-white hover:text-brand-maroon transition-all shadow-lg whitespace-nowrap"
              >
                {t('finder_recheck')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={cn(
        "flex-1 w-full mx-auto transition-all duration-500",
        showResults ? "max-w-[1440px] py-0" : "max-w-4xl py-12 px-4"
      )}>
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden"
            >
              {/* Wizard Progress Steps */}
              <div className="bg-slate-50/50 border-b border-slate-100 p-6 sm:p-8">
                <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                  {STEPS.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    return (
                      <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-500",
                          isActive ? "bg-[#1a3a5f] text-white scale-125 shadow-xl" : 
                          isCompleted ? "bg-green-500 text-white" : "bg-white text-slate-300 border-2 border-slate-100"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                        </div>
                      </div>
                    );
                  })}
                  <div className="absolute left-4 right-4 top-5 h-[2px] bg-slate-100 -z-0" />
                </div>
              </div>

              <div className="p-8 sm:p-16">
                {renderStep()}
              </div>

              {/* Wizard Footer */}
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                  className={cn(
                    "flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all uppercase tracking-widest text-sm",
                    currentStep === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                  {t('finder_prev')}
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-12 py-4 bg-brand-orange text-white rounded-2xl font-black hover:bg-[#1a3a5f] hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest"
                >
                  {currentStep === STEPS.length ? t('finder_submit') : t('finder_next')}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col lg:flex-row min-h-screen"
            >
              {/* Sidebar Filters - Clone of myscheme.gov.in */}
              <aside className="w-full lg:w-80 bg-white border-r border-slate-200 p-8 shrink-0 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-[#1a3a5f] uppercase tracking-tight">{t('finder_filters_title')}</h2>
                  <button 
                    onClick={() => setActiveFilters({ category: '', occupation: '', type: '', ageRange: '' })}
                    className="text-[10px] font-black text-brand-orange uppercase hover:underline tracking-widest"
                  >
                    {t('finder_reset_all')}
                  </button>
                </div>

                <div className="space-y-10">
                  {/* Scheme Type */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{t('finder_scheme_type')}</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'Central', label: t('finder_central_govt') },
                        { id: 'State', label: t('finder_state_govt') }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => toggleFilter('type', type.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-between group",
                            activeFilters.type === type.id
                              ? "bg-[#1a3a5f] border-[#1a3a5f] text-white shadow-lg shadow-[#1a3a5f]/20"
                              : "bg-white border-slate-50 text-slate-600 hover:border-[#1a3a5f]/20"
                          )}
                        >
                          {type.label}
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            activeFilters.type === type.id ? "bg-white border-white" : "border-slate-200 group-hover:border-[#1a3a5f]/40"
                          )}>
                            {activeFilters.type === type.id && <div className="w-2 h-2 bg-[#1a3a5f] rounded-full" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age Group Filter */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                      {t('finder_filter_age_group') || 'Age Group'}
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => toggleFilter('ageRange', '')}
                        className={cn(
                          "w-full p-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group",
                          activeFilters.ageRange === ''
                            ? "bg-brand-orange/10 text-brand-orange font-black"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            activeFilters.ageRange === '' ? "bg-brand-orange scale-150" : "bg-slate-200 group-hover:bg-slate-400"
                          )} />
                          {t('finder_filter_all_ages') || 'All Ages'}
                        </span>
                      </button>
                      {REAL_AGE_RANGES.map(range => (
                        <button
                          key={range.id}
                          onClick={() => toggleFilter('ageRange', range.id)}
                          className={cn(
                            "w-full p-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group",
                            activeFilters.ageRange === range.id
                              ? "bg-brand-orange/10 text-brand-orange font-black"
                              : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              activeFilters.ageRange === range.id ? "bg-brand-orange scale-150" : "bg-slate-200 group-hover:bg-slate-400"
                            )} />
                            {t(range.labelKey) || range.rangeText}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-lg",
                            activeFilters.ageRange === range.id ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-400"
                          )}>
                            {range.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{t('finder_categories')}</h3>
                    <div className="space-y-2">
                      {[
                        "Agriculture", "Education", "Business", "Healthcare", "Social Welfare", "Women Welfare", "Housing"
                      ].map(cat => {
                        const count = getMockResults().filter(s => s.category === cat).length;
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleFilter('category', cat)}
                            className={cn(
                              "w-full p-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group",
                              activeFilters.category === cat
                                ? "bg-brand-orange/10 text-brand-orange"
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                activeFilters.category === cat ? "bg-brand-orange scale-150" : "bg-slate-200 group-hover:bg-slate-400"
                              )} />
                              {t('cat_' + cat.toLowerCase().replace(/ /g, '_'))}
                            </span>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-lg",
                              activeFilters.category === cat ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-400"
                            )}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </aside>

              {/* Results Main Area */}
              <div className="flex-1 p-6 sm:p-12 bg-[#f8fafc]">
                <div className="max-w-5xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <div>
                      <h2 className="text-3xl font-black text-[#1a3a5f] mb-2">
                        {t('finder_found_schemes').replace('{count}', getMockResults().length.toString())}
                      </h2>
                      <p className="text-slate-500 font-medium">{t('finder_based_on_profile')}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {selectedLang.code !== 'en' && getMockResults().some(s => !getActiveScheme(s).isTranslated) && (
                        <button
                          onClick={translateAllResults}
                          disabled={isTranslatingAll}
                          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-brand-orange text-brand-orange rounded-2xl text-xs font-black hover:bg-brand-orange hover:text-white transition-all shadow-lg shadow-brand-orange/10 disabled:opacity-50"
                        >
                          {isTranslatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                          TRANSLATE ALL TO {selectedLang.name.toUpperCase()}
                        </button>
                      )}

                      <div className="flex items-center gap-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finder_profile_status_title')}</div>
                        <div className="text-sm font-bold text-green-600">{t('finder_verified_complete_status')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-8">
                    {getMockResults().length > 0 ? getMockResults().map((scheme, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden hover:shadow-2xl hover:border-brand-orange/20 transition-all group"
                      >
                        <div className="p-8 sm:p-10">
                          <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className={cn(
                              "px-4 py-1.5 text-[10px] font-black uppercase rounded-full tracking-widest",
                              scheme.type === 'Central' ? "bg-[#1a3a5f] text-white" : "bg-brand-orange text-white"
                            )}>
                              {scheme.type === 'Central' ? t('finder_central_govt') : t('finder_state_govt')}
                            </span>
                            <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full tracking-widest">
                              {t('cat_' + scheme.category.toLowerCase().replace(/ /g, '_'))}
                            </span>
                            <span className="px-4 py-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-black uppercase rounded-full tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {scheme.minAge === 0 && scheme.maxAge >= 100 
                                ? (t('finder_filter_all_ages') || 'All Ages')
                                : scheme.maxAge >= 100 
                                  ? `${scheme.minAge}+ ${t('finder_years')}`
                                  : `${scheme.minAge} - ${scheme.maxAge} ${t('finder_years')}`}
                            </span>
                          </div>
                          
                          <h3 className="text-2xl font-black text-[#1a3a5f] mb-4 group-hover:text-brand-orange transition-colors leading-tight">
                            {getActiveScheme(scheme).title}
                          </h3>
                          
                          <p className="text-slate-600 text-lg leading-relaxed mb-8 line-clamp-2">
                            {getActiveScheme(scheme).desc}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-10">
                            {scheme.tags.map(tag => (
                              <span key={tag} className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-100 tracking-widest">
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-slate-50">
                            <button 
                              onClick={() => setSelectedScheme(scheme)}
                              className="w-full sm:w-auto px-10 py-4 bg-[#1a3a5f] text-white rounded-2xl font-black hover:bg-brand-orange transition-all shadow-xl shadow-[#1a3a5f]/10 flex items-center justify-center gap-3 group/btn"
                            >
                              {t('scheme_view_details')}
                              <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-2" />
                            </button>
                            <a 
                              href={scheme.officialUrl || "https://www.myscheme.gov.in/"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-8 py-4 border-2 border-[#1a3a5f] text-[#1a3a5f] rounded-2xl font-black hover:bg-[#1a3a5f] hover:text-white transition-all flex items-center justify-center gap-3"
                            >
                              {t('scheme_apply_now')}
                              <ExternalLink className="w-5 h-5" />
                            </a>
                            {onToggleSaveScheme && (
                              <button
                                onClick={() => onToggleSaveScheme(scheme)}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all flex items-center justify-center",
                                  isSchemeSaved?.(scheme.title)
                                    ? "bg-orange-50 border-brand-orange text-brand-orange shadow-sm"
                                    : "border-slate-200 text-slate-400 hover:text-brand-orange hover:border-slate-300"
                                )}
                                title={isSchemeSaved?.(scheme.title) ? "Remove from saved" : "Save scheme to profile"}
                              >
                                <Bookmark className={cn("w-5 h-5", isSchemeSaved?.(scheme.title) && "fill-brand-orange")} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                          <Search className="w-12 h-12 text-slate-300" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-800 mb-4">{t('finder_no_matching_schemes')}</h4>
                        <p className="text-slate-500 max-w-md mx-auto mb-10">
                          {t('finder_no_matching_desc')}
                        </p>
                        <button 
                          onClick={() => setActiveFilters({ category: '', occupation: '', type: '', ageRange: '' })}
                          className="px-10 py-4 bg-brand-orange text-white rounded-2xl font-black hover:shadow-2xl transition-all uppercase tracking-widest"
                        >
                          {t('finder_reset_all_filters')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scheme Details Modal */}
        <AnimatePresence>
          {selectedScheme && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#1a3a5f]/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-8 sm:p-12 bg-[#1a3a5f] text-white relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48" />
                  <button 
                    onClick={() => setSelectedScheme(null)}
                    className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  
                  <div className="relative z-10">
                    <div className="flex flex-wrap gap-3 mb-6 items-center">
                      <span className="px-5 py-2 text-[10px] font-black uppercase rounded-full tracking-widest bg-white/20">
                        {selectedScheme.type === 'Central' ? t('finder_central_govt') : t('finder_state_govt')}
                      </span>
                      <span className="px-5 py-2 bg-white/10 text-white text-[10px] font-black uppercase rounded-full tracking-widest">
                        {t('cat_' + selectedScheme.category.toLowerCase().replace(/ /g, '_'))}
                      </span>
                      
                      {selectedLang.code !== 'en' && !getActiveScheme(selectedScheme).isTranslated && (
                        <button
                          onClick={() => handleTranslateScheme(selectedScheme)}
                          disabled={isTranslating}
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold transition-all ml-auto"
                        >
                          {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                          TRANSLATE TO {selectedLang.name.toUpperCase()}
                        </button>
                      )}

                      {getActiveScheme(selectedScheme).isTranslated && (
                        <span className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-[10px] font-bold text-green-400 ml-auto">
                          <CheckCircle2 className="w-3 h-3" />
                          TRANSLATED
                        </span>
                      )}
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-[1.1] tracking-tight max-w-3xl">
                      {getActiveScheme(selectedScheme).title}
                    </h2>
                    <p className="text-white/70 text-xl max-w-3xl leading-relaxed">
                      {getActiveScheme(selectedScheme).desc}
                    </p>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-16 custom-scrollbar">
                  <div className="grid lg:grid-cols-2 gap-16">
                    {/* Benefits Section */}
                    <section>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/10">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1a3a5f] uppercase tracking-tight">{t('scheme_benefits')}</h3>
                      </div>
                      <div className="space-y-4">
                        {(getActiveScheme(selectedScheme).benefits || []).map((benefit: string, i: number) => (
                          <div key={i} className="flex gap-4 p-6 bg-green-50/30 border border-green-100 rounded-[24px] hover:bg-green-50 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 mt-1">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-slate-700 text-lg font-bold leading-relaxed">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Eligibility Section */}
                    <section>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                          <Users className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1a3a5f] uppercase tracking-tight">{t('scheme_eligibility')}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-5 bg-amber-50/60 border border-amber-200/80 rounded-[24px]">
                          <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                          <div>
                            <span className="text-xs font-black text-amber-900 uppercase tracking-wider block mb-0.5">
                              {t('scheme_eligible_age') || 'Eligible Age Range'}
                            </span>
                            <span className="text-slate-800 text-base font-bold">
                              {selectedScheme.minAge === 0 && selectedScheme.maxAge >= 100
                                ? (t('finder_filter_all_ages') || 'All Ages')
                                : selectedScheme.maxAge >= 100
                                  ? `${selectedScheme.minAge}+ ${t('finder_years')}`
                                  : `${selectedScheme.minAge} - ${selectedScheme.maxAge} ${t('finder_years')}`}
                            </span>
                          </div>
                        </div>

                        {(getActiveScheme(selectedScheme).eligibility || []).map((item: string, i: number) => (
                          <div key={i} className="flex items-center gap-5 p-6 bg-blue-50/30 border border-blue-100 rounded-[24px] hover:bg-blue-50 transition-colors">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-lg shadow-blue-500/40" />
                            <span className="text-slate-700 text-lg font-bold leading-relaxed">{item}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-16">
                    {/* Documents Section */}
                    <section>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10">
                          <FileText className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1a3a5f] uppercase tracking-tight">{t('scheme_documents')}</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(getActiveScheme(selectedScheme).documents || []).map((doc: string, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                            <span className="text-slate-600 font-bold">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Process Section */}
                    <section>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/10">
                          <ListChecks className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1a3a5f] uppercase tracking-tight">{t('scheme_process')}</h3>
                      </div>
                      <div className="space-y-8 relative before:absolute before:left-[23px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100">
                        {(getActiveScheme(selectedScheme).process || []).map((step: string, i: number) => (
                          <div key={i} className="flex gap-6 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-purple-500 text-purple-600 flex items-center justify-center text-lg font-black shrink-0 shadow-xl shadow-purple-500/10">
                              {i + 1}
                            </div>
                            <div className="pt-2">
                              <span className="text-slate-700 text-lg font-bold leading-relaxed">{step}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
                  <button 
                    onClick={() => setSelectedScheme(null)}
                    className="text-slate-400 font-black uppercase tracking-widest hover:text-slate-800 transition-all"
                  >
                    {t('scheme_close_details')}
                  </button>
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <button 
                      onClick={onAskSevaBot}
                      className="px-10 py-5 bg-[#1a3a5f] text-white rounded-[24px] font-black hover:bg-brand-orange transition-all shadow-2xl shadow-[#1a3a5f]/20 flex items-center justify-center gap-3"
                    >
                      {t('scheme_ask_sevabot')}
                    </button>
                    <a 
                      href={selectedScheme.officialUrl || "https://www.myscheme.gov.in/"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-10 py-5 bg-brand-orange text-white rounded-[24px] font-black hover:bg-[#1a3a5f] transition-all shadow-2xl shadow-brand-orange/20 flex items-center justify-center gap-3"
                    >
                      {t('scheme_apply_now')} <ExternalLink className="w-6 h-6" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
