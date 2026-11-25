import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Film,
  Image as ImageIcon,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { parseServiceAccountJson } from '../utils/browserAiVideo';

export default function AiCredentialsModal({
  isOpen,
  onClose,
  apiKey = '',
  serviceAccountJson = '',
  onSave = () => {}
}) {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempSaJson, setTempSaJson] = useState(serviceAccountJson);
  const [validationError, setValidationError] = useState('');
  const [parsedSaInfo, setParsedSaInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTempApiKey(apiKey);
      setTempSaJson(serviceAccountJson);
      setValidationError('');
    }
  }, [isOpen, apiKey, serviceAccountJson]);

  useEffect(() => {
    if (!tempSaJson.trim()) {
      setParsedSaInfo(null);
      setValidationError('');
      return;
    }
    try {
      const parsed = parseServiceAccountJson(tempSaJson);
      setParsedSaInfo({ projectId: parsed.project_id, clientEmail: parsed.client_email });
      setValidationError('');
    } catch (e) {
      setParsedSaInfo(null);
      setValidationError(e.message);
    }
  }, [tempSaJson]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTempSaJson(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    if (tempSaJson.trim()) {
      try {
        parseServiceAccountJson(tempSaJson);
      } catch (e) {
        setValidationError(e.message);
        return;
      }
    }
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    localStorage.setItem('gcp_service_account_json', tempSaJson.trim());
    onSave({
      apiKey: tempApiKey.trim(),
      serviceAccountJson: tempSaJson.trim()
    });
    onClose();
  };

  const handleClearAll = () => {
    setTempApiKey('');
    setTempSaJson('');
    setParsedSaInfo(null);
    setValidationError('');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gcp_service_account_json');
    onSave({ apiKey: '', serviceAccountJson: '' });
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative text-white space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close AI Settings"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
            <Key size={26} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">
              AI Video Credentials (Bring Your Own Key)
            </h3>
            <p className="text-xs text-slate-400">
              Enter <strong>either</strong> credential below (or both) to unlock AI creature celebrations—even on GitHub Pages!
            </p>
          </div>
        </div>

        {/* Comparison & Drawbacks Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Option 1 Info */}
          <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-indigo-300">
              <ImageIcon size={16} />
              <span>Option 1: Gemini API Key</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Paste a standard Gemini key (<code className="text-pink-300">AIzaSy...</code> or <code className="text-pink-300">AQ...</code>). Generates <strong>3 custom HD AI multi-creature scenes</strong> in ~15–25s.
            </p>
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> Drawbacks:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-200/80">
                <li><strong>Animated stills only:</strong> Google blocks API keys from calling Veo video endpoints directly, so scenes use smooth Ken Burns motion rather than full 3D video/audio.</li>
                <li>Uses your Gemini API image/text quota.</li>
              </ul>
            </div>
          </div>

          {/* Option 2 Info */}
          <div className="bg-slate-950/80 border border-pink-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-pink-300">
              <Film size={16} />
              <span>Option 2: GCP Service Account (.json)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Upload or paste a Google Cloud Service Account JSON key (with <em>Vertex AI Agent Platform User</em> role) for <strong>true Veo 3.1 720p cinematic video + audio</strong>! Works standalone even without Option 1.
            </p>
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> Drawbacks:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-200/80">
                <li><strong>Paid GCP billing &amp; slower:</strong> Takes <strong>60–90s</strong> per new creature and incurs Vertex AI Veo per-second charges on your Google Cloud billing account.</li>
                <li>Requires enabling Agent Platform API in GCP Console.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Input 1: Gemini API Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Option 1 — Gemini API Key <span className="text-slate-500 font-normal">(Optional if Option 2 is set)</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy... or AQ..."
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Input 2: Service Account JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Option 2 — Google Cloud Service Account JSON <span className="text-pink-400 font-semibold">(Unlocks True Veo 3.1)</span>
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
                <Upload size={13} />
                <span>Upload .json File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={3}
              placeholder='Paste Service Account JSON ({"type": "service_account", "project_id": "...", ...}) or upload .json above'
              value={tempSaJson}
              onChange={(e) => setTempSaJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-pink-500"
            />

            {parsedSaInfo && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>
                  Valid Service Account loaded: <code>{parsedSaInfo.projectId}</code> ({parsedSaInfo.clientEmail})
                </span>
              </div>
            )}

            {validationError && (
              <p className="text-rose-400 text-xs font-semibold">{validationError}</p>
            )}
          </div>
        </div>

        {/* Browser Storage Security Notice */}
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3.5 flex items-start gap-2.5 text-[11px] text-slate-300 leading-relaxed">
          <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Browser-Only Storage Notice:</strong> Credentials entered here are stored <em>only</em> in your browser&apos;s <code>localStorage</code> and sent directly over HTTPS to <code>*.googleapis.com</code> (never to GitHub). <strong>Drawback:</strong> Do not save keys on shared/public computers—use <strong>Clear Keys</strong> below when done. Leaving both blank uses the free built-in offline 3D preview.
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-300 transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear Saved Keys</span>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-pink-600 hover:from-indigo-400 hover:to-pink-500 rounded-xl text-xs font-extrabold text-white shadow-lg transition-all"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
