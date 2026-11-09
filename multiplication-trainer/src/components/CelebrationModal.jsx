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
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { getCachedVideo, saveCachedVideo } from '../utils/videoCache';
import { generateCreatureCardAsset } from '../utils/creatureCardGenerator';
import { generateSimulatedCreatureVideo } from '../utils/videoSimulator';

export default function CelebrationModal({
  creature,
  isOpen,
  onClose,
  isCodexReplay = false,
  apiKey = '',
  onSaveApiKey = () => {}
}) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadingStep, setLoadingStep] = useState('Preparing creature card...');
  const [videoData, setVideoData] = useState(null); // { videoUrl, videoBlob, prompts }
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      hue: Math.random() * 60 + 330 // Gold / Pink / Purple sparkles
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

    async function loadVideo() {
      setPhase('loading');
      setErrorMessage('');
      setProgress(0);

      try {
        // 1. Check client IndexedDB cache first
        setLoadingStep('Checking Bestiary video cache...');
        const cached = await getCachedVideo(creature.id);
        if (cached && (cached.videoUrl || cached.videoBlob)) {
          if (!isMounted) return;
          console.log(`[CelebrationModal] Replaying cached video for ${creature.name}`);
          setVideoData(cached);
          setPhase('ready');
          return;
        }

        // 2. Generate clean collectible card image crop
        setLoadingStep('Synthesizing 3D collectible holographic card...');
        const cardImageBase64 = await generateCreatureCardAsset(creature);

        // 3. Try Backend Endpoint
        setLoadingStep('Connecting to Veo 2 video synthesis engine...');
        const storedKey = apiKey || localStorage.getItem('gemini_api_key') || '';

        let backendSuccess = false;
        try {
          const res = await fetch('/api/generate-creature-video', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-gemini-api-key': storedKey
            },
            body: JSON.stringify({
              creatureId: creature.id,
              creatureName: creature.name,
              creatureElement: creature.element || 'Cosmic Flame',
              creatureDescription: creature.description,
              creatureImageBase64: cardImageBase64,
              apiKey: storedKey
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.videoUrl) {
              backendSuccess = true;
              if (!isMounted) return;
              const resultObj = {
                creatureId: creature.id,
                videoUrl: data.videoUrl,
                prompts: data.prompts
              };
              await saveCachedVideo(creature.id, resultObj);
              setVideoData(resultObj);
              setPhase('ready');
              return;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            if (errData.needsKey) {
              console.log('[CelebrationModal] No API Key found, offering Demo fallback');
            }
          }
        } catch (netErr) {
          console.warn('[CelebrationModal] Serverless endpoint unavailable:', netErr.message);
        }

        // 4. Fallback / Simulation Demo Mode (if no API key or offline)
        if (!backendSuccess) {
          setLoadingStep('Generating 3D Adventure continuous animation...');
          const simResult = await generateSimulatedCreatureVideo(creature, {
            onProgress: (p) => {
              if (isMounted) setProgress(Math.round(p * 100));
            }
          });

          if (!isMounted) return;
          await saveCachedVideo(creature.id, simResult);
          setVideoData(simResult);
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
  }, [isOpen, creature]);

  // Video Time & Progress sync
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 1;
    setProgress((current / duration) * 100);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  // Download video
  const handleDownload = () => {
    if (!videoData?.videoUrl) return;
    const a = document.createElement('a');
    a.href = videoData.videoUrl;
    const safeName = creature.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeName}-3D-Adventure.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  creature.rarity === 'Mythic' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  creature.rarity === 'Legendary' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}>
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
              onClick={() => setShowKeyPrompt(!showKeyPrompt)}
              title="Configure Gemini API Key"
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Key size={18} />
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

        {/* Optional Gemini API Key Drawer */}
        {showKeyPrompt && (
          <div className="bg-indigo-950/90 border-b border-indigo-500/30 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-indigo-200 animate-in slide-in-from-top duration-200 z-30">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
              <span>Enter your <strong>Google Gemini API Key</strong> to generate real Veo 2 & Gemini 2.5 videos:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="bg-slate-900 border border-indigo-500/40 text-white rounded-lg px-3 py-1.5 text-xs w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={() => {
                  onSaveApiKey(inputKey);
                  localStorage.setItem('gemini_api_key', inputKey);
                  setShowKeyPrompt(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="relative min-h-[380px] sm:min-h-[480px] w-full flex items-center justify-center bg-black overflow-hidden">
          
          {/* Phase 1: Sparkle Loading Card */}
          {phase === 'loading' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center">
              {/* Particle Canvas */}
              <canvas
                ref={canvasRef}
                width={854}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
              />

              {/* Shimmering Holographic Card Silhouette */}
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

              {/* Status Message */}
              <div className="relative z-10 mt-6 space-y-2">
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-sm tracking-wide">
                  <Film size={16} className="animate-spin text-yellow-400" />
                  <span>Unlocking 3D Creature Video...</span>
                </div>
                <p className="text-slate-400 text-xs max-w-sm">{loadingStep}</p>
                {progress > 0 && (
                  <div className="w-48 bg-slate-800 h-1.5 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 2: Full-Bleed Cinematic Video Player */}
          {phase === 'ready' && videoData?.videoUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black group">
              <video
                ref={videoRef}
                src={videoData.videoUrl}
                autoPlay
                playsInline
                loop
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className="w-full max-h-[500px] object-contain cursor-pointer"
              />

              {/* Overlay HUD / Controls */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 transition-opacity duration-300 opacity-90 group-hover:opacity-100">
                {/* Progress bar */}
                <div
                  className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    if (videoRef.current) {
                      videoRef.current.currentTime = ratio * videoRef.current.duration;
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
                      3D Card Reveal & Adventure Run
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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
              <button
                onClick={() => setPhase('loading')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs shadow-md transition-all"
              >
                Retry Generation
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-900 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span className="truncate max-w-md">
            {creature.description}
          </span>
          <span className="text-indigo-400 font-semibold flex-shrink-0">
            Powered by Google Veo 2 & Gemini 2.5
          </span>
        </div>
      </div>
    </div>
  );
}
