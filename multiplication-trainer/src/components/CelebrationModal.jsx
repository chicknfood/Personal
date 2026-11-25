import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Film,
  Key,
  AlertCircle
} from 'lucide-react';
import { getCachedVideo, saveCachedVideo } from '../utils/videoCache';
import { generateCreatureCardAsset } from '../utils/creatureCardGenerator';
import { generateSimulatedCreatureVideo } from '../utils/videoSimulator';
import { generateCreatureVideoInBrowser } from '../utils/browserAiVideo';
import AiCredentialsModal from './AiCredentialsModal';

export default function CelebrationModal({
  creature,
  isOpen,
  onClose,
  isCodexReplay = false,
  apiKey = '',
  serviceAccountJson = '',
  onSaveCredentials = () => {}
}) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadingStep, setLoadingStep] = useState('Preparing creature card...');
  const [videoData, setVideoData] = useState(null); // { videoUrl, adventureVideoUrl, prompts }
  const [activeClipIndex, setActiveClipIndex] = useState(0); // 0 = main/card, 1 = adventure extension
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [engineLabel, setEngineLabel] = useState('');
  const [regenCounter, setRegenCounter] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);
  const canvasRef = useRef(null);

  const hasDualClips = Boolean(videoData?.videoUrl && videoData?.adventureVideoUrl);
  const getActiveVideoEl = () =>
    hasDualClips && activeClipIndex === 1 ? videoRef2.current : videoRef1.current;

  // Sparkle shaders & particle animation for loading card
  useEffect(() => {
    if (!isOpen || phase !== 'loading') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 1.5 + Math.random() * 3,
      alpha: Math.random(),
      speed: 0.5 + Math.random() * 1.5,
      hue: Math.random() * 60 + 330
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.alpha += 0.02 * (Math.random() > 0.5 ? 1 : -1);
        if (p.alpha < 0.1) p.alpha = 0.1;
        if (p.alpha > 0.9) p.alpha = 0.9;
        if (p.y < 0) p.y = canvas.height;

        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 75%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen, phase]);

  // Main Loader & Fetch Flow
  useEffect(() => {
    if (!isOpen || !creature) return;

    let isMounted = true;
    const isForcedRegen = regenCounter > 0;

    async function loadVideo() {
      setPhase('loading');
      setErrorMessage('');
      setFallbackNotice('');
      setProgress(0);
      setActiveClipIndex(0);
      setIsPlaying(true);

      try {
        const isStaticHost =
          typeof window !== 'undefined' &&
          (window.location.protocol === 'file:' || window.location.hostname.endsWith('github.io'));

        const activeApiKey = (apiKey || localStorage.getItem('gemini_api_key') || '').trim();
        const activeSaJson = (
          serviceAccountJson ||
          localStorage.getItem('gcp_service_account_json') ||
          ''
        ).trim();
        const hasBrowserCredentials = Boolean(activeApiKey || activeSaJson);

        // 1. Check client IndexedDB cache first
        if (!isForcedRegen) {
          setLoadingStep('Checking Bestiary video cache...');
          const cached = await getCachedVideo(creature.id);
          if (cached && (cached.videoUrl || cached.videoBlob)) {
            const isCachedAi = cached.engine && cached.engine !== 'Offline Demo';
            // Replay immediately if it's already an AI video, OR if on static host with no browser keys configured
            if (isCachedAi || (isStaticHost && !hasBrowserCredentials)) {
              if (!isMounted) return;
              setEngineLabel(cached.engine || 'Cached Video');
              setVideoData(cached);
              setPhase('ready');
              return;
            }
          }
        }

        // 2. Generate clean collectible card image crop
        setLoadingStep('Synthesizing 3D collectible holographic card...');
        const cardImageBase64 = await generateCreatureCardAsset(creature);

        let generationSucceeded = false;
        let lastAiError = '';

        // 3A. Try Local / Serverless Backend first when not on static-only hosting
        if (!isStaticHost) {
          setLoadingStep('Generating AI 3D Card & Creature Encounter Video (60–90s)...');
          try {
            const res = await fetch('/api/generate-creature-video', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-gemini-api-key': activeApiKey
              },
              body: JSON.stringify({
                creatureId: creature.id,
                creatureName: creature.name,
                creatureElement: creature.element || 'Cosmic Flame',
                creatureDescription: creature.description,
                creatureImageBase64: cardImageBase64,
                apiKey: activeApiKey,
                forceRegenerate: isForcedRegen
              })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.videoUrl) {
                generationSucceeded = true;
                if (!isMounted) return;
                let videoBlob = null;
                try {
                  const blobRes = await fetch(data.videoUrl);
                  if (blobRes.ok) videoBlob = await blobRes.blob();
                } catch (e) {}

                const engine = data.engine || 'Veo 3.1 (Cinematic AI)';
                const resultObj = {
                  creatureId: creature.id,
                  videoUrl: videoBlob ? URL.createObjectURL(videoBlob) : data.videoUrl,
                  videoBlob,
                  adventureBlob: null,
                  adventureVideoUrl: null,
                  engine,
                  prompts: data.prompts
                };
                await saveCachedVideo(creature.id, resultObj);
                setEngineLabel(engine);
                setVideoData(resultObj);
                setPhase('ready');
                return;
              }
            } else if (res.status !== 404 && res.status !== 405) {
              const errData = await res.json().catch(() => ({}));
              lastAiError = errData.error || `Server error (${res.status})`;
            }
          } catch (netErr) {
            console.warn('[CelebrationModal] Backend unavailable, checking browser-direct AI:', netErr.message);
          }
        }

        // 3B. Browser-Direct AI Mode (GitHub Pages / Standalone / Bring-Your-Own-Key)
        if (!generationSucceeded && hasBrowserCredentials) {
          try {
            const browserResult = await generateCreatureVideoInBrowser({
              creature,
              cardImageBase64,
              geminiApiKey: activeApiKey,
              serviceAccountJson: activeSaJson,
              onStatus: (msg) => {
                if (isMounted) setLoadingStep(msg);
              },
              onProgress: (p) => {
                if (isMounted) setProgress(Math.round(p));
              }
            });

            if (!isMounted) return;
            await saveCachedVideo(creature.id, browserResult);
            setEngineLabel(browserResult.engine);
            setVideoData(browserResult);
            setPhase('ready');
            return;
          } catch (browserErr) {
            lastAiError = browserErr.message;
            console.error('[CelebrationModal] Browser-direct AI failed:', browserErr);
          }
        }

        // 4. Fallback / Offline 3D Preview Mode
        if (!generationSucceeded) {
          setFallbackNotice(
            lastAiError
              ? `AI error (${lastAiError.slice(0, 110)}) — playing offline 3D preview`
              : 'No AI key configured — click the Key icon above to enter a Gemini Key or Service Account for AI video!'
          );
          setLoadingStep('Generating built-in 3D Adventure preview...');
          const simResult = await generateSimulatedCreatureVideo(creature, {
            onProgress: (p) => {
              if (isMounted) setProgress(Math.round(p * 100));
            }
          });

          if (!isMounted) return;
          const entry = { ...simResult, engine: 'Offline Demo' };
          await saveCachedVideo(creature.id, entry);
          setEngineLabel('Offline Demo');
          setVideoData(entry);
          setPhase('ready');
        }
      } catch (err) {
        console.error('[CelebrationModal] Error during video generation:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to generate creature video');
          setPhase('error');
        }
      }
    }

    loadVideo();

    return () => {
      isMounted = false;
    };
  }, [isOpen, creature, regenCounter]);

  // Unified progress across single or dual-clip playback
  const handleTimeUpdate = () => {
    if (hasDualClips) {
      const d1 = videoRef1.current?.duration || 4;
      const d2 = videoRef2.current?.duration || 8;
      const total = d1 + d2;
      const elapsed =
        activeClipIndex === 0
          ? videoRef1.current?.currentTime || 0
          : d1 + (videoRef2.current?.currentTime || 0);
      setProgress(Math.min(100, (elapsed / total) * 100));
    } else if (videoRef1.current) {
      const current = videoRef1.current.currentTime;
      const duration = videoRef1.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleClip1Ended = () => {
    if (!hasDualClips || !videoRef2.current) return;
    setActiveClipIndex(1);
    videoRef2.current.currentTime = 0;
    videoRef2.current.muted = isMuted;
    videoRef2.current.play().catch(() => {});
  };

  const handleClip2Ended = () => {
    if (!videoRef1.current) return;
    setActiveClipIndex(0);
    videoRef1.current.currentTime = 0;
    videoRef1.current.muted = isMuted;
    videoRef1.current.play().catch(() => {});
  };

  const togglePlay = () => {
    const activeEl = getActiveVideoEl();
    if (!activeEl) return;
    if (isPlaying) {
      activeEl.pause();
      setIsPlaying(false);
    } else {
      activeEl.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (videoRef1.current) videoRef1.current.muted = nextMuted;
    if (videoRef2.current) videoRef2.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRestart = () => {
    if (videoRef2.current) {
      videoRef2.current.pause();
      videoRef2.current.currentTime = 0;
    }
    setActiveClipIndex(0);
    if (videoRef1.current) {
      videoRef1.current.currentTime = 0;
      videoRef1.current.play();
    }
    setIsPlaying(true);
  };

  // Download video(s)
  const handleDownload = () => {
    if (!videoData?.videoUrl) return;
    const safeName = creature.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    const triggerDownload = (url, filename) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    if (videoData.adventureVideoUrl) {
      triggerDownload(videoData.videoUrl, `${safeName}-Part1-Card-Reveal.mp4`);
      setTimeout(() => {
        triggerDownload(videoData.adventureVideoUrl, `${safeName}-Part2-3D-Encounter.mp4`);
      }, 350);
    } else {
      triggerDownload(videoData.videoUrl, `${safeName}-3D-Adventure.mp4`);
    }
  };

  if (!isOpen || !creature) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-slate-950 rounded-3xl overflow-hidden border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.25)] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-white/10 z-20">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">{creature.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-tight">{creature.name}</h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    creature.rarity === 'Mythic'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : creature.rarity === 'Legendary'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {creature.rarity}
                </span>
              </div>
              <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                <Sparkles size={12} className="text-yellow-400" />
                {isCodexReplay ? 'Bestiary Codex Replay' : 'New Creature Milestone Discovery!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              title="Configure Gemini Key or GCP Service Account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 hover:text-white transition-colors"
            >
              <Key size={14} />
              <span className="hidden sm:inline">AI Key</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close celebration"
              title="Close"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[380px] sm:min-h-[480px] w-full flex items-center justify-center bg-black overflow-hidden">
          {/* Phase 1: Sparkle Loading Card */}
          {phase === 'loading' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <canvas
                ref={canvasRef}
                width={854}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
              />

              <div className="relative z-10 w-48 sm:w-56 h-64 sm:h-72 rounded-2xl bg-gradient-to-tr from-pink-500 via-amber-400 to-indigo-600 p-1 shadow-[0_0_40px_rgba(236,72,153,0.4)] animate-pulse">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  <div className="text-7xl mb-3 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                    {creature.emoji}
                  </div>
                  <span className="text-white font-bold text-base">{creature.name}</span>
                  <span className="text-[11px] text-indigo-300 font-semibold mt-1">
                    {creature.element || 'Mythic Power'}
                  </span>
                </div>
              </div>

              <div className="relative z-10 mt-6 space-y-2">
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-sm tracking-wide">
                  <Film size={16} className="animate-spin text-yellow-400" />
                  <span>Unlocking 3D Creature Video...</span>
                </div>
                <p className="text-slate-400 text-xs max-w-md">{loadingStep}</p>
                {progress > 0 && (
                  <div className="w-56 bg-slate-800 h-1.5 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Full-Bleed Cinematic Video Player (Single or Seamless Dual-Clip) */}
          {phase === 'ready' && videoData?.videoUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black group">
              <video
                ref={videoRef1}
                src={videoData.videoUrl}
                autoPlay
                playsInline
                loop={!hasDualClips}
                muted={isMuted}
                onTimeUpdate={activeClipIndex === 0 ? handleTimeUpdate : undefined}
                onEnded={hasDualClips ? handleClip1Ended : undefined}
                onClick={togglePlay}
                className={`w-full max-h-[500px] object-contain cursor-pointer ${
                  hasDualClips && activeClipIndex !== 0 ? 'hidden' : 'block'
                }`}
              />

              {hasDualClips && (
                <video
                  ref={videoRef2}
                  src={videoData.adventureVideoUrl}
                  preload="auto"
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={activeClipIndex === 1 ? handleTimeUpdate : undefined}
                  onEnded={handleClip2Ended}
                  onClick={togglePlay}
                  className={`w-full max-h-[500px] object-contain cursor-pointer ${
                    activeClipIndex === 1 ? 'block' : 'hidden'
                  }`}
                />
              )}

              {/* Overlay HUD / Controls */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 transition-opacity duration-300 opacity-90 group-hover:opacity-100">
                {/* Progress bar */}
                <div
                  className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (hasDualClips && videoRef1.current && videoRef2.current) {
                      const d1 = videoRef1.current.duration || 4;
                      const d2 = videoRef2.current.duration || 8;
                      const targetSec = ratio * (d1 + d2);
                      if (targetSec < d1) {
                        videoRef2.current.pause();
                        setActiveClipIndex(0);
                        videoRef1.current.currentTime = targetSec;
                        if (isPlaying) videoRef1.current.play();
                      } else {
                        videoRef1.current.pause();
                        setActiveClipIndex(1);
                        videoRef2.current.currentTime = targetSec - d1;
                        if (isPlaying) videoRef2.current.play();
                      }
                    } else if (videoRef1.current) {
                      videoRef1.current.currentTime = ratio * (videoRef1.current.duration || 1);
                    }
                  }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-between text-white text-xs pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <button
                      onClick={handleRestart}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                      title="Replay from start"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <span className="text-white/60 font-medium hidden sm:inline">
                      3D Card Reveal &amp; Multi-Creature Encounter
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRegenCounter((c) => c + 1)}
                      title="Regenerate a fresh AI video"
                      className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-full transition-colors"
                    >
                      <Sparkles size={14} className="text-yellow-300" />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold px-4 py-2 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      <Download size={16} />
                      <span>Save Video (MP4)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Error fallback */}
          {phase === 'error' && (
            <div className="p-8 text-center space-y-4 max-w-md">
              <AlertCircle size={48} className="text-rose-500 mx-auto" />
              <h4 className="text-lg font-bold text-white">Video Generation Unavailable</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full text-xs transition-all"
                >
                  Check AI Key Settings
                </button>
                <button
                  onClick={() => setRegenCounter((c) => c + 1)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs shadow-md transition-all"
                >
                  Retry Generation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-900 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span className="truncate max-w-xl">
            {fallbackNotice ? (
              <button
                type="button"
                onClick={() => setShowKeyModal(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold underline decoration-amber-500/40 text-left"
              >
                {fallbackNotice}
              </button>
            ) : (
              creature.description
            )}
          </span>
          <span className="text-indigo-400 font-semibold flex-shrink-0">
            {engineLabel ? `Engine: ${engineLabel}` : 'Powered by Google Veo 3.1 & Gemini'}
          </span>
        </div>
      </div>

      {/* Unified AI Key & Service Account Modal */}
      <AiCredentialsModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        apiKey={apiKey}
        serviceAccountJson={serviceAccountJson}
        onSave={(creds) => {
          onSaveCredentials(creds);
          // Automatically trigger fresh AI generation if currently viewing the offline demo
          if (engineLabel === 'Offline Demo' && (creds.apiKey || creds.serviceAccountJson)) {
            setRegenCounter((c) => c + 1);
          }
        }}
      />
    </div>
  );
}
