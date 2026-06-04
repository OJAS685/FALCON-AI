import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Sparkles, Copy, Download, Share2, Trash2, 
  Languages, UserCheck, History, Printer, Send, RefreshCw, 
  CheckCircle, ChevronRight, AlertCircle, BookOpen, Briefcase, 
  Building, User, Check
} from 'lucide-react';
import { SavedLetter } from '../types';

interface SmartLettersViewProps {
  user: any;
  onUserUpdate: (updatedUser: any) => void;
}

const APPLICATION_TYPES = [
  { id: 'school_leave', label: 'School Leave', icon: BookOpen, category: 'Academic' },
  { id: 'sick_leave', label: 'Sick Leave', icon: AlertCircle, category: 'General' },
  { id: 'holiday_leave', label: 'Holiday Leave', icon: AlertCircle, category: 'General' },
  { id: 'principal_perm', label: 'Principal Permission', icon: BookOpen, category: 'Academic' },
  { id: 'fee_concession', label: 'Fee Concession', icon: BookOpen, category: 'Academic' },
  { id: 'char_cert', label: 'Character Certificate', icon: BookOpen, category: 'Academic' },
  { id: 'bonafide_cert', label: 'Bonafide Certificate', icon: BookOpen, category: 'Academic' },
  { id: 'job_leave', label: 'Job Leave Application', icon: Briefcase, category: 'Professional' },
  { id: 'office_leave', label: 'Office Leave', icon: Briefcase, category: 'Professional' },
  { id: 'bank_app', label: 'Bank Application', icon: Building, category: 'Official' },
  { id: 'complaint_letter', label: 'Complaint Letter', icon: AlertCircle, category: 'Official' },
  { id: 'scholarship_req', label: 'Scholarship Request', icon: BookOpen, category: 'Academic' },
  { id: 'resignation', label: 'Resignation Letter', icon: Briefcase, category: 'Professional' },
];

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'hinglish', label: 'Hinglish', native: 'Hindi (Roman)', flag: '🇮🇳' }
];

const TEMPLATES = [
  { id: 'student', label: 'Student Persona', desc: 'Optimized for school & college requests', icon: User },
  { id: 'teacher', label: 'Teacher Persona', desc: 'Formal academic & faculty styles', icon: BookOpen },
  { id: 'employee', label: 'Employee Persona', desc: 'Standard workplace & corporate voice', icon: Briefcase },
  { id: 'business', label: 'Business Persona', desc: 'High-stake official & external relations', icon: Building }
];

export default function SmartLettersView({ user, onUserUpdate }: SmartLettersViewProps) {
  // Input fields
  const [selectedType, setSelectedType] = useState('sick_leave');
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [selectedTemplate, setSelectedTemplate] = useState<'student' | 'teacher' | 'employee' | 'business'>('student');
  
  const [inputs, setInputs] = useState({
    name: user.name || '',
    receiver: '',
    entityName: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    duration: '1 Day',
    additional: ''
  });

  // State handlers
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<{
    formal: string;
    professional: string;
    short: string;
    detailed: string;
    aiSuggestions: string[];
  } | null>(null);
  
  const [activeOutputTab, setActiveOutputTab] = useState<'formal' | 'professional' | 'short' | 'detailed'>('formal');
  const [savedLetters, setSavedLetters] = useState<SavedLetter[]>([]);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Load history on load
  useEffect(() => {
    fetchSavedLetters();
  }, []);

  const fetchSavedLetters = async () => {
    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch('/api/user/saved-letters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedLetters(data.savedLetters);
        }
      }
    } catch (err) {
      console.error("Failed to load letter history logs:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputs(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputs.name || !inputs.receiver || !inputs.entityName || !inputs.reason) {
      setErrorMessage("Please fill all required fields marked with *");
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch('/api/ai/letters/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: APPLICATION_TYPES.find(t => t.id === selectedType)?.label || selectedType,
          ...inputs,
          language: selectedLang,
          templateType: selectedTemplate
        })
      });

      if (!res.ok) {
        throw new Error("Failed to process script variants.");
      }

      const data = await res.json();
      if (data.success) {
        setGeneratedLetter({
          formal: data.formal,
          professional: data.professional,
          short: data.short,
          detailed: data.detailed,
          aiSuggestions: data.aiSuggestions || []
        });
        setActiveOutputTab('formal');
      } else {
        throw new Error(data.error || "Generation mismatch");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Internal network mismatch. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  // Archive generated application to history
  const handleSaveToHistory = async () => {
    if (!generatedLetter) return;
    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch('/api/user/saved-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: APPLICATION_TYPES.find(t => t.id === selectedType)?.label || selectedType,
          inputs,
          outputs: {
            formal: generatedLetter.formal,
            professional: generatedLetter.professional,
            short: generatedLetter.short,
            detailed: generatedLetter.detailed
          },
          language: selectedLang,
          templateType: selectedTemplate,
          aiSuggestions: generatedLetter.aiSuggestions
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedLetters(data.savedLetters);
          // Auto update parent user object if present
          if (user) {
            onUserUpdate({ ...user, savedLetters: data.savedLetters });
          }
          // Highlight trace with transient indicator
          setShared(true);
          setTimeout(() => setShared(false), 2000);
        }
      }
    } catch (err) {
      console.error("Failed to trace state save:", err);
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch(`/api/user/saved-letters/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSavedLetters(data.savedLetters);
          if (user) {
            onUserUpdate({ ...user, savedLetters: data.savedLetters });
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete trace node:", err);
    }
  };

  const handleCopy = () => {
    if (!generatedLetter) return;
    const activeText = generatedLetter[activeOutputTab];
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDocx = () => {
    if (!generatedLetter) return;
    const text = generatedLetter[activeOutputTab];
    const typeLabel = APPLICATION_TYPES.find(t => t.id === selectedType)?.label || 'Application';

    const formattedHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${typeLabel}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; margin: 1in; color: #1e293b; }
          .document-content { white-space: pre-line; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="document-content">${text.replace(/\n/g, '<br>')}</div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + formattedHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_application.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTxt = () => {
    if (!generatedLetter) return;
    const text = generatedLetter[activeOutputTab];
    const typeLabel = APPLICATION_TYPES.find(t => t.id === selectedType)?.label || 'Application';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${typeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_application.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadPastLetter = (past: SavedLetter) => {
    setSelectedType(past.type.toLowerCase().replace(/ /g, '_'));
    setSelectedLang(past.language || 'en');
    setSelectedTemplate(past.templateType || 'student');
    setInputs({
      name: past.inputs.name,
      receiver: past.inputs.receiver,
      entityName: past.inputs.entityName,
      reason: past.inputs.reason,
      date: past.inputs.date || '',
      duration: past.inputs.duration || '',
      additional: past.inputs.additional || ''
    });
    setGeneratedLetter({
      formal: past.outputs.formal,
      professional: past.outputs.professional,
      short: past.outputs.short,
      detailed: past.outputs.detailed,
      aiSuggestions: past.aiSuggestions || []
    });
    setActiveOutputTab('formal');
    setActiveTab('editor');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Nav controllers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FileText className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
              Smart Letters & Leave Maker
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Premium high-precision scribe powered by professional AI matrices
          </p>
        </div>

        {/* Navigation Mode selection */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-widest uppercase transition-all rounded-lg cursor-pointer ${activeTab === 'editor' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scribe Lab</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-widest uppercase transition-all rounded-lg cursor-pointer ${activeTab === 'history' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Archives ({savedLetters.length})</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'editor' ? (
          <motion.div
            key="scribe-lab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            
            {/* Input Form Panel (Left) */}
            <div className="lg:col-span-5 space-y-6">
              
              <form onSubmit={handleGenerate} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5 mb-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold font-mono text-gray-300 uppercase tracking-wider">Configure Coordinates</span>
                </div>

                {/* Document Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">Application Intent *</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer font-sans"
                  >
                    {APPLICATION_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        [{type.category.toUpperCase()}] — {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Templates Personas */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">Target Template / Role Context</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(tmpl => {
                      const Icon = tmpl.icon;
                      const active = selectedTemplate === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tmpl.id as any)}
                          className={`p-3 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${active ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200' : 'bg-black/20 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-gray-400'}`} />
                            <span className="text-[10px] font-mono tracking-wide font-bold">{tmpl.label}</span>
                          </div>
                          <span className="text-[9px] text-gray-500 line-clamp-1">{tmpl.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selectors */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block">Output Script Dialect</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setSelectedLang(lang.id as any)}
                        className={`py-2 px-3 rounded-xl border transition-all text-xs font-mono flex items-center justify-center gap-2 cursor-pointer ${selectedLang === lang.id ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-black/20 border-white/5 hover:border-white/10 text-gray-400 hover:text-white'}`}
                      >
                        <span>{lang.flag}</span>
                        <span className="text-[10px]">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details Fields Box */}
                <div className="space-y-4 pt-1">
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Your Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={inputs.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        required
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Receiver Persona *</label>
                      <input
                        type="text"
                        name="receiver"
                        value={inputs.receiver}
                        onChange={handleInputChange}
                        placeholder="Principal / HR Manager"
                        required
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">School / Company / Bank Name *</label>
                    <input
                      type="text"
                      name="entityName"
                      value={inputs.entityName}
                      onChange={handleInputChange}
                      placeholder="St. Xavier High School"
                      required
                      className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Reason / Core justification *</label>
                    <input
                      type="text"
                      name="reason"
                      value={inputs.reason}
                      onChange={handleInputChange}
                      placeholder="Sudden family emergency, high fever, etc."
                      required
                      className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Effective Date *</label>
                      <input
                        type="text"
                        name="date"
                        value={inputs.date}
                        onChange={handleInputChange}
                        placeholder="24th Oct 2026 / Today"
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Duration *</label>
                      <input
                        type="text"
                        name="duration"
                        value={inputs.duration}
                        onChange={handleInputChange}
                        placeholder="1 Day / 1 Week"
                        className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono tracking-wider text-gray-400">Additional Details / Custom Instructions</label>
                    <textarea
                      name="additional"
                      value={inputs.additional}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Attach doctor notes, provide cell number as fallback contact, etc."
                      className="w-full bg-[#0d0e14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                    />
                  </div>

                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-cyan-800 disabled:to-blue-900 text-white font-mono uppercase tracking-widest text-xs py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:pointer-events-none cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing variants...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Formulate Scribe Options</span>
                    </>
                  )}
                </button>
              </form>

            </div>

            {/* Generated Outputs Preview Panel (Right) */}
            <div className="lg:col-span-7 flex flex-col h-full space-y-6">
              
              {generatedLetter ? (
                <div className="space-y-6 flex flex-col h-full">
                  
                  {/* Output Variants Toggler Tabs */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Interactive Variants</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveToHistory}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all text-[10px] font-bold font-mono tracking-wide flex items-center gap-1 cursor-pointer"
                        >
                          {shared ? <Check className="w-3 h-3 text-emerald-400" /> : <SaveIcon className="w-3 h-3" />}
                          <span>{shared ? 'ARCHIVED' : 'SAVE TO HISTORY'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                      {(['formal', 'professional', 'short', 'detailed'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveOutputTab(tab)}
                          className={`py-2 px-1 text-center text-[10px] font-mono tracking-wider uppercase transition-all rounded-lg cursor-pointer ${activeOutputTab === tab ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Letter Blueprint Sheet layout */}
                  <div className="relative group bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col flex-grow">
                    
                    {/* Control Panel overlay bar */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 rounded-t-2xl">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400 uppercase">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>A4 Letter Rendering</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleCopy}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer relative"
                          title="Copy letter to Clipboard"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          {copied && (
                            <span className="absolute -top-7 right-0 text-[9px] bg-emerald-500 text-white font-mono px-2 py-0.5 rounded shadow">
                              Copied!
                            </span>
                          )}
                        </button>

                        <button
                          onClick={downloadDocx}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="Download Word File (.doc)"
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                        </button>

                        <button
                          onClick={downloadTxt}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="Download Plain Text File (.txt)"
                        >
                          <FileIcon className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setIsPrintMode(true)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="Print / Save PDF"
                        >
                          <Printer className="w-4 h-4 text-pink-400" />
                        </button>
                      </div>
                    </div>

                    {/* Styled Paper Sheet container */}
                    <div className="p-8 md:p-10 bg-[#fbfbfe] text-slate-800 rounded-b-2xl font-serif text-xs leading-relaxed space-y-4 shadow-xl select-text overflow-y-auto max-h-[480px]">
                      <div className="whitespace-pre-wrap font-serif" style={{ fontFamily: "Georgia, serif" }}>
                        {generatedLetter[activeOutputTab]}
                      </div>
                    </div>

                  </div>

                  {/* AI Smart Suggestions feedback log */}
                  {generatedLetter.aiSuggestions && generatedLetter.aiSuggestions.length > 0 && (
                    <div className="bg-cyan-950/15 border border-cyan-500/20 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>AI Scribe Insights & Checklist</span>
                      </div>
                      <ul className="space-y-2 bg-black/20 p-4 rounded-xl border border-white/5">
                        {generatedLetter.aiSuggestions.map((sug, sIndex) => (
                          <li key={sIndex} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                            <span className="text-cyan-400 font-mono align-baseline flex-shrink-0">✦</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl text-center space-y-4 min-h-[350px]">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-full">
                    <FileText className="w-8 h-8 text-cyan-500" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-semibold tracking-wider font-mono text-gray-300 uppercase">Variant Panel Standby</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-sans">
                      Complete left coordinates configure parameters, then transmit. Scribe AI will outline four parallel formatting templates.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </motion.div>
        ) : (
          <motion.div
            key="history-logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {savedLetters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedLetters.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => loadPastLetter(l)}
                    className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyan-500/30 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-[9px] font-mono uppercase tracking-widest font-bold">
                          {l.type}
                        </span>
                        
                        <button
                          onClick={(e) => handleDeleteHistory(l.id, e)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Purge record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-gray-100 font-mono uppercase truncate">{l.inputs.name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono truncate">For: {l.inputs.receiver} — {l.inputs.entityName}</p>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-400 line-clamp-2 italic leading-relaxed">
                          "{l.inputs.reason}"
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
                      <span>{new Date(l.createdAt).toLocaleDateString()}</span>
                      <span className="text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        <span>Load script</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-white/[0.01] border border-white/5 rounded-2xl text-center space-y-4">
                <History className="w-8 h-8 text-gray-600" />
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-xs font-bold font-mono tracking-widest text-gray-400 uppercase">Archive Logs Void</h3>
                  <p className="text-xs text-gray-500 font-sans">
                    No generated leave templates cataloged on this profile yet. Complete draft coordinates on laboratories to safe trace files,
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Printable Modal (PDF Trigger) */}
      <AnimatePresence>
        {isPrintMode && generatedLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsPrintMode(false)}></div>
            <div className="relative bg-white text-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header preview controllers */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-bold font-mono tracking-wider text-gray-600 uppercase">Print & Save PDF Module</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold tracking-widest flex items-center gap-2 shadow cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>TRIGGER PRINT</span>
                  </button>
                  <button
                    onClick={() => setIsPrintMode(false)}
                    className="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-mono transition-colors cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              </div>

              {/* Printable sheet container */}
              <div id="printable-area" className="p-12 md:p-16 overflow-y-auto bg-white flex-grow select-text leading-relaxed text-xs">
                <div style={{ fontFamily: "Georgia, serif" }} className="whitespace-pre-wrap text-slate-950 font-serif text-[11pt]">
                  {generatedLetter[activeOutputTab]}
                </div>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Print stylesheet rule injecting dynamically */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            padding: 0;
            margin: 0;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

    </div>
  );
}

// Inline fallback light icons
function SaveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
  );
}
