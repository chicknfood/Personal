import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Zap,
  Clock,
  AlertCircle,
  Sparkles,
  BookOpen,
  Lock,
  ChevronLeft,
  X,
  ShieldAlert,
  Film,
  Key,
  ShieldCheck
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

import CelebrationModal from './components/CelebrationModal';
import { getAllCachedVideoIds } from './utils/videoCache';

// --- CLOUD DATABASE SETUP ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'math-trainer-app';

// --- CONFIGURATION ---
const TOTAL_QUESTIONS = 64; 
const NUMBERS_AVAILABLE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TIME_LIMITS = [
  { label: 'Relaxed (10s)', value: 10 },
  { label: 'Normal (5s)', value: 5 },
  { label: 'Ninja (3s)', value: 3 },
  { label: 'Unlimited', value: 0 },
];

// --- 18 FANTASTICAL CREATURES ---
const CREATURES = [
  { threshold: 100, id: "chrono-phoenix", name: "Chrono-Phoenix", rarity: "Mythic", element: "Time & Cosmic Flame", emoji: "🦚", bgGradient: "from-rose-500 via-red-500 to-amber-500", shadow: "shadow-red-500/50", description: "Bends the fabric of reality! Only reveals itself to those who achieve absolute perfection." },
  { threshold: 100, id: "nebula-kraken", name: "Nebula-Kraken", rarity: "Mythic", element: "Void & Dark Matter", emoji: "🦑", bgGradient: "from-indigo-900 via-purple-800 to-black", shadow: "shadow-purple-900/50", description: "A cosmic cephalopod that calculates the mass of black holes. Requires a flawless mind!" },
  { threshold: 100, id: "seraph-prime", name: "Seraph-Prime", rarity: "Mythic", element: "Sacred Light & Fractals", emoji: "✨", bgGradient: "from-yellow-300 via-amber-200 to-white", shadow: "shadow-yellow-500/50", description: "An entity of pure light and geometry. Its wings are made of fractal equations." },
  { threshold: 95, id: "astro-leviathan", name: "Astro-Leviathan", rarity: "Legendary", element: "Supernova & Plasma", emoji: "🐉", bgGradient: "from-fuchsia-600 to-purple-800", shadow: "shadow-purple-500/50", description: "A cosmic dragon born from a supernova! Its mighty roar can pause time itself!" },
  { threshold: 95, id: "quantum-yeti", name: "Quantum-Yeti", rarity: "Legendary", element: "Dimensional Ice & Cyber", emoji: "🦍", bgGradient: "from-cyan-400 to-blue-700", shadow: "shadow-cyan-500/50", description: "Exists in multiple dimensions! It only solidifies when an equation is perfectly balanced." },
  { threshold: 95, id: "mecha-pegasus", name: "Mecha-Pegasus", rarity: "Legendary", element: "Cyber-Steel & Rocket Fuel", emoji: "🦄", bgGradient: "from-slate-300 to-gray-600", shadow: "shadow-gray-500/50", description: "A cybernetic steed with jet-thruster wings. Runs on pure logic and high-octane rocket fuel." },
  { threshold: 85, id: "storm-griffin", name: "Storm-Griffin", rarity: "Rare", element: "Thunder & Lightning", emoji: "🦅", bgGradient: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/50", description: "A majestic sky-hunter that glides on lightning currents. Looks for sharp minds to befriend!" },
  { threshold: 85, id: "crystal-golem", name: "Crystal-Golem", rarity: "Rare", element: "Earth & Radiant Geodes", emoji: "💎", bgGradient: "from-teal-400 to-emerald-700", shadow: "shadow-teal-500/50", description: "A hulking guardian of geodes. It rumbles with a deep laugh when you carry the one correctly." },
  { threshold: 85, id: "lunar-moth", name: "Lunar-Moth", rarity: "Rare", element: "Starlight & Night Ether", emoji: "🦋", bgGradient: "from-indigo-400 to-violet-600", shadow: "shadow-indigo-500/50", description: "Its wings dust the night sky with starlight. Drawn to the bright minds of math champions!" },
  { threshold: 70, id: "volt-fox", name: "Volt-Fox", rarity: "Uncommon", element: "Electric Sparks & Plasma", emoji: "🦊", bgGradient: "from-orange-400 to-red-500", shadow: "shadow-orange-500/50", description: "A crackling creature that runs on electricity. The faster you solve, the brighter its tail glows!" },
  { threshold: 70, id: "aqua-slime", name: "Aqua-Slime", rarity: "Uncommon", element: "Pure Water & Torrent", emoji: "💧", bgGradient: "from-blue-300 to-cyan-500", shadow: "shadow-blue-400/50", description: "A bubbly mass of sentient water that loves to divide and multiply itself!" },
  { threshold: 70, id: "copper-scarab", name: "Copper-Scarab", rarity: "Uncommon", element: "Clockwork Brass & Gears", emoji: "🪲", bgGradient: "from-amber-600 to-yellow-800", shadow: "shadow-amber-700/50", description: "A mechanical bug with tiny gears that tick perfectly in time with your correct answers." },
  { threshold: 50, id: "ember-sprite", name: "Ember-Sprite", rarity: "Common", element: "Wildfire & Embers", emoji: "🔥", bgGradient: "from-amber-400 to-orange-600", shadow: "shadow-amber-500/50", description: "A mischievous little flame that loves numbers. Helps warm up your brain for calculations!" },
  { threshold: 50, id: "breeze-bunny", name: "Breeze-Bunny", rarity: "Common", element: "Wind & Aero Mist", emoji: "🐇", bgGradient: "from-sky-200 to-blue-400", shadow: "shadow-sky-400/50", description: "Hops on currents of air! Faster than a calculator, but sometimes trips over remainders." },
  { threshold: 50, id: "moss-turtle", name: "Moss-Turtle", rarity: "Common", element: "Forest Moss & Stone", emoji: "🐢", bgGradient: "from-green-600 to-emerald-800", shadow: "shadow-green-600/50", description: "Slow, steady, and wise. Reminds you that taking your time to get it right is key!" },
  { threshold: 0, id: "cobble-sprout", name: "Cobble-Sprout", rarity: "Basic", element: "Flora & Earth Sprout", emoji: "🌱", bgGradient: "from-emerald-400 to-green-600", shadow: "shadow-emerald-500/50", description: "A tiny rock-plant. Might be small now, but with practice, it will grow into a mountain!" },
  { threshold: 0, id: "star-dust", name: "Star-Dust", rarity: "Basic", element: "Nebular Dust & Starlight", emoji: "☄️", bgGradient: "from-gray-400 to-slate-600", shadow: "shadow-gray-500/50", description: "A tiny speck of stardust. Remember, even the largest galaxies started just like this!" },
  { threshold: 0, id: "pebble-pup", name: "Pebble-Pup", rarity: "Basic", element: "Solid Stone & Granite", emoji: "🪨", bgGradient: "from-stone-400 to-stone-600", shadow: "shadow-stone-500/50", description: "A rock shaped like a puppy! It wags its little tail when you learn from a mistake." }
];

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [unlockedCreatures, setUnlockedCreatures] = useState([]);
  const [cachedVideoIds, setCachedVideoIds] = useState([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Celebration Modal state
  const [celebrationCreature, setCelebrationCreature] = useState(null);
  const [isCodexReplay, setIsCodexReplay] = useState(false);

  // Local storage persistence fallback when Firebase is not active
  useEffect(() => {
    if (db) return;
    try {
      const saved = localStorage.getItem("unlocked_creatures");
      if (saved) {
        setUnlockedCreatures(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }, []);

  // Load cached video IDs and API key
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(key);
    setTempApiKey(key);

    getAllCachedVideoIds()
      .then(ids => setCachedVideoIds(ids))
      .catch(() => {});
  }, []);
  
  const [gameState, setGameState] = useState('setup'); 
  const [selectedTables, setSelectedTables] = useState([2, 5, 10]);
  const [cutoffTime, setCutoffTime] = useState(5);
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [history, setHistory] = useState([]);
  const [showCorrection, setShowCorrection] = useState(false);
  
  const [displayedReward, setDisplayedReward] = useState({ creature: null, isNew: false, finalGrade: 0, rawAccuracy: 0 });
  const [selectedCodexCreature, setSelectedCodexCreature] = useState(null); // For popup

  // --- CLOUD SYNC LOGIC ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const pokedexRef = collection(db, 'artifacts', appId, 'users', user.uid, 'pokedex');
    const unsubscribe = onSnapshot(pokedexRef, (snapshot) => {
      setUnlockedCreatures(snapshot.docs.map(doc => doc.id));
    }, (error) => console.error("Failed to sync codex:", error));
    return () => unsubscribe();
  }, [user]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (gameState !== 'playing' || cutoffTime === 0 || showCorrection) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, [gameState, timeLeft, cutoffTime, showCorrection]);

  const handleTimeout = () => {
    recordAnswer(false, '⏰ Timeout');
    setShowCorrection(true);
    setStreak(0);
  };

  const submitAnswer = () => {
    if (userAnswer === '' || showCorrection || gameState !== 'playing') return;
    const submittedNum = parseInt(userAnswer);
    const isCorrect = submittedNum === questions[currentIndex]?.answer;
    
    recordAnswer(isCorrect, submittedNum);

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > longestStreak) setLongestStreak(nextStreak);
      setCorrectAnswers(prev => prev + 1);
      nextQuestion(true);
    } else {
      setStreak(0);
      setShowCorrection(true);
    }
  };

  const nextQuestion = (wasLastCorrect) => {
    setShowCorrection(false);
    setUserAnswer('');
    if (currentIndex + 1 >= TOTAL_QUESTIONS) {
      const finalCorrectCount = correctAnswers + (wasLastCorrect ? 1 : 0);
      calculateAndSaveReward(finalCorrectCount);
      setGameState('results');
    } else {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(cutoffTime > 0 ? cutoffTime : 999);
    }
  };

  const recordAnswer = (isCorrect, submitted) => {
    const currentQ = questions[currentIndex];
    setHistory(prev => {
      const existingIdx = prev.findIndex(item => item.index === currentIndex);
      if (existingIdx >= 0) return prev; 
      return [...prev, { index: currentIndex, a: currentQ.a, b: currentQ.b, answer: currentQ.answer, isCorrect, submitted, timeLeft: cutoffTime > 0 ? (cutoffTime - timeLeft).toFixed(1) : 'N/A' }];
    });
  };

  const handleNumpad = (val) => { if (userAnswer.length < 3 && !showCorrection) setUserAnswer(prev => prev + val); };
  const handleBackspace = () => { if (!showCorrection) setUserAnswer(prev => prev.slice(0, -1)); };

  // --- LOGIC: Setup ---
  const toggleTable = (num) => {
    setSelectedTables(prev => 
      prev.includes(num) ? (prev.length > 1 ? prev.filter(n => n !== num) : prev) : [...prev, num].sort((a,b)=>a-b)
    );
  };

  const startGame = () => {
    const pool = [];
    selectedTables.forEach(table => {
      for (let i = 1; i <= 12; i++) {
        pool.push({ a: table, b: i, answer: table * i });
      }
    });

    const sessionQuestions = [];
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      sessionQuestions.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    setQuestions(sessionQuestions);
    setCurrentIndex(0);
    setCorrectAnswers(0);
    setStreak(0);
    setLongestStreak(0);
    setHistory([]);
    setUserAnswer('');
    setShowCorrection(false);
    setTimeLeft(cutoffTime > 0 ? cutoffTime : 999);
    setGameState('playing');
  };

  // --- INTEGRITY & REWARD MATH ---
  const calculateMaxGrade = (tables) => {
    const selectedCount = tables.length;
    let baseWeight = 0;
    tables.forEach(t => {
      if ([1, 2, 10].includes(t)) baseWeight += 4;
      else if ([5, 11].includes(t)) baseWeight += 7;
      else baseWeight += 12;
    });

    const calculatedCap = 35 + (selectedCount * 3) + (baseWeight * 0.45);
    return Math.min(100, Math.round(calculatedCap));
  };

  const calculateAndSaveReward = (correctCount) => {
    const rawAccuracy = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
    const maxGradePossible = calculateMaxGrade(selectedTables);
    
    // Final Grade throttled by complexity selection
    const finalGrade = Math.round((correctCount / TOTAL_QUESTIONS) * maxGradePossible);

    const eligible = CREATURES.filter(c => c.threshold <= finalGrade);
    const lockedEligible = eligible.filter(c => !unlockedCreatures.includes(c.id));

    let selectedCreature = null;
    let isNew = false;

    if (lockedEligible.length > 0) {
      const maxEligibleThreshold = Math.max(...lockedEligible.map(c => c.threshold));
      const topTierLocked = lockedEligible.filter(c => c.threshold === maxEligibleThreshold);
      
      selectedCreature = topTierLocked[Math.floor(Math.random() * topTierLocked.length)];
      isNew = true;

      if (user && db) {
        const creatureRef = doc(db, "artifacts", appId, "users", user.uid, "pokedex", selectedCreature.id);
        setDoc(creatureRef, { unlockedAt: new Date().toISOString() }, { merge: true });
      } else {
        setUnlockedCreatures(prev => {
          const next = prev.includes(selectedCreature.id) ? prev : [...prev, selectedCreature.id];
          try {
            localStorage.setItem("unlocked_creatures", JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    } else {
      const maxThreshold = Math.max(...eligible.map(c => c.threshold));
      const topTierEligible = eligible.filter(c => c.threshold === maxThreshold);
      selectedCreature = topTierEligible[Math.floor(Math.random() * topTierEligible.length)];
      isNew = false;
    }

    setDisplayedReward({ creature: selectedCreature, isNew, finalGrade, rawAccuracy });

    // Automatically trigger the 3D Adventure Video celebration if a new milestone creature is unlocked!
    if (isNew && selectedCreature) {
      setCelebrationCreature(selectedCreature);
      setIsCodexReplay(false);
    }
  };

  // --- UI COMPONENTS ---
  const renderSetup = () => {
    const maxPotentialGrade = calculateMaxGrade(selectedTables);
    
    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto p-6 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2 relative w-full">
          
          {/* AI Settings Button */}
          <button 
            onClick={() => setShowApiKeyModal(true)}
            className="absolute left-0 top-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-2xl transition-all flex flex-col items-center shadow-sm"
            title="Configure Gemini AI Key for Veo 2 Video Synthesis"
          >
            <Key size={24} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">AI Key</span>
          </button>

          {/* Codex Button */}
          <button 
            onClick={() => setGameState('codex')}
            className="absolute right-0 top-0 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-3 rounded-2xl transition-all flex flex-col items-center shadow-sm"
          >
            <BookOpen size={24} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Codex</span>
          </button>

          <h1 className="text-4xl font-extrabold text-indigo-700 flex items-center justify-center gap-3">
            <Zap className="text-yellow-500" size={40} fill="currentColor" /> Math Champions
          </h1>
          <p className="text-gray-600 font-medium">Select the tables you want to conquer!</p>
        </div>

        <div className="w-full bg-white p-6 rounded-3xl shadow-xl border border-indigo-50">
          
          {/* Integrity / Max Grade Meter */}
          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className={`${maxPotentialGrade === 100 ? 'text-emerald-500' : 'text-amber-500'}`} size={28} />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Possible Grade</span>
                <span className="text-xl font-extrabold text-slate-800">
                  Grade {maxPotentialGrade} / 100
                </span>
              </div>
            </div>
            
            <div className="text-right">
              {maxPotentialGrade === 100 ? (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  ✨ Mythic Tier Unlocked!
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Select harder tables to reach 100!
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {NUMBERS_AVAILABLE.map(num => {
              const isSelected = selectedTables.includes(num);
              return (
                <button
                  key={num}
                  onClick={() => toggleTable(num)}
                  className={`h-16 text-2xl font-black rounded-2xl transition-all shadow-sm flex items-center justify-center border-2 ${
                    isSelected 
                      ? 'bg-indigo-600 text-white border-indigo-600 scale-[1.02] shadow-indigo-200 shadow-md' 
                      : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  {num}×
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setSelectedTables([...NUMBERS_AVAILABLE])} 
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
            >
              Select All (100 Max)
            </button>
            <button 
              onClick={() => setSelectedTables([2, 5, 10])} 
              className="text-sm font-bold text-gray-400 hover:text-gray-600"
            >
              Easy Tables (Low Cap)
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Cutoff Speed</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIME_LIMITS.map(limit => (
                <button
                  key={limit.value}
                  onClick={() => setCutoffTime(limit.value)}
                  className={`py-3 px-2 text-sm font-bold rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                    cutoffTime === limit.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Clock size={16} />
                  {limit.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={startGame} disabled={selectedTables.length === 0} className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-2xl font-extrabold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
          <Play fill="currentColor" /> Let's Go!
        </button>
      </div>
    );
  };

  const renderGame = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return null; 
    const progressPercent = cutoffTime === 0 || showCorrection ? 100 : (timeLeft / cutoffTime) * 100;
    
    // Live grade calculation based on complexity cap
    const maxGradePossible = calculateMaxGrade(selectedTables);
    const currentGrade = currentIndex === 0 ? maxGradePossible : Math.round((correctAnswers / currentIndex) * maxGradePossible);
    
    let progressColor = "bg-emerald-500";
    if (cutoffTime > 0 && !showCorrection) {
      if (progressPercent < 25) progressColor = "bg-red-500";
      else if (progressPercent < 50) progressColor = "bg-yellow-400";
    }
    if (showCorrection) progressColor = "bg-red-400"; 

    return (
      <div className="flex flex-col items-center max-w-md mx-auto p-4 space-y-6 animate-in slide-in-from-right duration-300">
        <div className="w-full flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col"><span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Question</span><span className="text-xl font-black text-indigo-700">{currentIndex + 1} / {TOTAL_QUESTIONS}</span></div>
          <div className="flex flex-col items-end"><span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Grade</span><span className="text-xl font-black text-emerald-600">{currentGrade}</span></div>
        </div>

        <div className={`w-full rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[220px] border-b-8 relative overflow-hidden transition-colors duration-300 ${showCorrection ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}>
          {!showCorrection && streak >= 3 && (
            <div className="absolute top-4 right-4 flex items-center gap-1 text-orange-500 animate-pulse"><Zap fill="currentColor" size={20} /><span className="font-bold">{streak} Streak!</span></div>
          )}
          {showCorrection ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <div className="text-red-500 font-bold flex items-center gap-2 mb-2"><AlertCircle size={24} /> Let's review...</div>
              <div className="text-5xl sm:text-6xl font-black text-gray-800 tracking-tighter line-through decoration-red-400 decoration-4 mb-2">{userAnswer || '⏰'}</div>
              <div className="text-5xl sm:text-6xl font-black text-emerald-600 bg-emerald-50 px-6 py-2 rounded-2xl border-2 border-emerald-200">{currentQ.a} × {currentQ.b} = {currentQ.answer}</div>
            </div>
          ) : (
            <>
              <div className="text-6xl sm:text-7xl font-black text-gray-800 tracking-tighter">{currentQ.a} × {currentQ.b}</div>
              <div className="mt-8 text-5xl font-black text-indigo-600 h-16 flex items-center justify-center bg-indigo-50 w-32 rounded-2xl border-2 border-indigo-200">{userAnswer || <span className="text-indigo-200">?</span>}</div>
            </>
          )}
        </div>

        {cutoffTime > 0 && (
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${progressColor} transition-all duration-100 ease-linear`} style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        <div className="w-full grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => handleNumpad(num.toString())} disabled={showCorrection} className="bg-white text-gray-700 text-3xl font-bold py-4 rounded-2xl shadow-sm border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{num}</button>
          ))}
          <button onClick={handleBackspace} disabled={showCorrection} className="bg-gray-100 text-gray-600 text-xl font-bold py-4 rounded-2xl shadow-sm border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">⌫</button>
          <button onClick={() => handleNumpad('0')} disabled={showCorrection} className="bg-white text-gray-700 text-3xl font-bold py-4 rounded-2xl shadow-sm border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed">0</button>
          <button onClick={submitAnswer} disabled={showCorrection} className="bg-emerald-500 text-white text-xl font-bold py-4 rounded-2xl shadow-sm border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"><Play fill="currentColor" size={24} /></button>
        </div>

        {showCorrection && (
          <button onClick={() => nextQuestion(false)} className="w-full py-4 bg-gray-800 text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-gray-700 transition-all animate-bounce">Next Question →</button>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (history.length === 0 || !displayedReward.creature) return null;

    const { creature, isNew, finalGrade, rawAccuracy } = displayedReward;
    const missedQuestions = history.filter(h => !h.isCorrect);

    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto p-6 space-y-8 animate-in zoom-in-95 duration-700">
        <div className={`w-full bg-gradient-to-br ${creature.bgGradient} p-1 rounded-3xl shadow-2xl ${creature.shadow} relative overflow-hidden transform transition-all hover:scale-[1.02]`}>
          <div className="bg-slate-900 w-full h-full rounded-[23px] p-8 flex flex-col items-center text-center relative overflow-hidden">
            
            {isNew && (
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMMCA0TDEgNEwxIDBaTTEgMUwyIDFMMiAyTDEgMlpNMCAyTDAgNEwxIDRMMSAyWk0yIDBMMiAyTDMgMkwzIDBaTTIgMkwyIDRMMyA0TDMgMloiIGZpbGw9IiNlN2U1ZTQiLz4KPC9zdmc+')] opacity-20 animate-pulse" />
            )}

            <div className={`text-xs font-black tracking-widest uppercase mb-2 ${isNew ? 'text-green-400 animate-bounce' : 'text-white/50'}`}>
              {isNew ? '✨ NEW DISCOVERY! ✨' : 'Attracted a familiar friend'}
            </div>
            
            <div className="text-8xl mb-4 filter drop-shadow-2xl animate-bounce relative z-10">{creature.emoji}</div>
            <h2 className="text-3xl font-black text-white mb-1 tracking-tight relative z-10">{creature.name}</h2>
            
            <div className={`text-sm font-bold uppercase tracking-widest mb-2 relative z-10 ${
              creature.rarity === 'Mythic' ? 'text-rose-400' :
              creature.rarity === 'Legendary' ? 'text-fuchsia-400' :
              creature.rarity === 'Rare' ? 'text-blue-400' :
              creature.rarity === 'Uncommon' ? 'text-orange-400' : 'text-emerald-400'
            }`}>{creature.rarity}</div>

            <div className="text-xs text-indigo-300 font-bold mb-4 relative z-10">
              ⚡ {creature.element || 'Cosmic'}
            </div>
            
            <p className="text-slate-300 font-medium text-sm sm:text-base leading-relaxed px-4 relative z-10">{creature.description}</p>

            {/* 3D Video Button right on Results Card */}
            <div className="mt-6 relative z-10">
              <button
                onClick={() => {
                  setCelebrationCreature(creature);
                  setIsCodexReplay(false);
                }}
                className="px-8 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-black rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Film size={20} className="animate-spin text-yellow-300" />
                <span>{cachedVideoIds.includes(creature.id) ? '🎬 Replay 3D Adventure Video' : '⚡ 3D Adventure Video Reveal'}</span>
              </button>
            </div>

            <div className="w-full grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/50 font-bold uppercase text-center leading-tight mb-1">Complexity<br/>Grade</span>
                <span className="text-2xl font-black text-white">{finalGrade}</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/10">
                <span className="text-[10px] text-white/50 font-bold uppercase text-center leading-tight mb-1">Raw<br/>Accuracy</span>
                <span className="text-2xl font-black text-white">{rawAccuracy}%</span>
              </div>
              <div className="flex flex-col items-center border-l border-white/10">
                <span className="text-[10px] text-white/50 font-bold uppercase text-center leading-tight mb-1">Longest<br/>Streak</span>
                <span className="text-2xl font-black text-white">{longestStreak}</span>
              </div>
            </div>
          </div>
        </div>

        {missedQuestions.length > 0 && (
          <div className="w-full bg-white p-6 rounded-3xl shadow-md border-t-4 border-red-400">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle className="text-red-500" /> Review Board</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {missedQuestions.map((item, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col justify-between items-start">
                  <div className="w-full flex justify-between items-center text-lg font-black text-gray-800 mb-1"><span>{item.a} × {item.b}</span><span className="text-emerald-600">= {item.answer}</span></div>
                  <div className="w-full text-right text-sm font-bold text-red-400">You guessed: <span className={item.submitted === '⏰ Timeout' ? '' : 'line-through'}>{item.submitted}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 w-full sm:w-auto">
          <button onClick={() => setGameState('codex')} className="flex-1 px-6 py-4 bg-indigo-100 text-indigo-700 text-lg font-bold rounded-full shadow-md hover:bg-indigo-200 transition-all flex items-center justify-center gap-2"><BookOpen size={20} /> Codex</button>
          <button onClick={() => setGameState('setup')} className="flex-1 px-8 py-4 bg-gray-800 text-white text-lg font-bold rounded-full shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2"><RotateCcw size={20} /> Play Again</button>
        </div>
      </div>
    );
  };

  const renderCodexPopup = () => {
    if (!selectedCodexCreature) return null;
    const c = selectedCodexCreature;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedCodexCreature(null)}>
        <div className={`w-full max-w-sm bg-gradient-to-br ${c.bgGradient} p-1 rounded-3xl shadow-2xl ${c.shadow} relative overflow-hidden animate-in zoom-in-95 duration-300`} onClick={e => e.stopPropagation()}>
          <div className="bg-slate-900 w-full h-full rounded-[23px] p-8 flex flex-col items-center text-center relative">
            <button onClick={() => setSelectedCodexCreature(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full p-1"><X size={24} /></button>
            <div className="text-9xl mb-4 filter drop-shadow-2xl mt-4">{c.emoji}</div>
            <h2 className="text-3xl font-black text-white mb-1 tracking-tight">{c.name}</h2>
            
            <div className={`text-sm font-bold uppercase tracking-widest mb-1 ${
              c.rarity === 'Mythic' ? 'text-rose-400' : c.rarity === 'Legendary' ? 'text-fuchsia-400' : c.rarity === 'Rare' ? 'text-blue-400' : c.rarity === 'Uncommon' ? 'text-orange-400' : 'text-emerald-400'
            }`}>{c.rarity}</div>

            <div className="text-xs text-indigo-300 font-bold mb-4">
              ⚡ {c.element || 'Cosmic Power'}
            </div>

            <p className="text-slate-300 font-medium leading-relaxed px-2 pb-4 text-xs sm:text-sm">{c.description}</p>

            {/* Play 3D Adventure Video Button in Codex */}
            <button
              onClick={() => {
                setSelectedCodexCreature(null);
                setCelebrationCreature(c);
                setIsCodexReplay(true);
              }}
              className="w-full mt-2 py-3 px-5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-extrabold rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <Film size={18} className="text-yellow-300" />
              <span>{cachedVideoIds.includes(c.id) ? 'Replay 3D Adventure Video' : 'Unlock 3D Adventure Video'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCodex = () => {
    return (
      <div className="flex flex-col items-center max-w-4xl mx-auto p-6 space-y-8 animate-in slide-in-from-bottom duration-500">
        <div className="w-full flex items-center justify-between">
          <button onClick={() => setGameState('setup')} className="bg-white p-3 rounded-full shadow-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><ChevronLeft size={24} /></button>
          <h2 className="text-3xl font-black text-indigo-800 flex items-center gap-3"><BookOpen className="text-indigo-500" /> Creature Codex</h2>
          <div className="w-12" /> 
        </div>

        <div className="w-full bg-indigo-50 p-4 rounded-2xl flex justify-between items-center text-indigo-800 shadow-inner">
          <span className="font-bold">Discovery Progress</span>
          <span className="text-2xl font-black">{unlockedCreatures.length} / {CREATURES.length}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
          {CREATURES.map((creature) => {
            const isUnlocked = unlockedCreatures.includes(creature.id);
            const hasVideo = cachedVideoIds.includes(creature.id);

            if (isUnlocked) {
              return (
                <div
                  key={creature.id}
                  onClick={() => setSelectedCodexCreature(creature)}
                  className={`bg-gradient-to-br ${creature.bgGradient} p-1 rounded-2xl shadow-lg transform transition-all hover:scale-105 cursor-pointer relative`}
                >
                  {hasVideo && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1 z-10 animate-pulse">
                      <Film size={10} /> 3D
                    </div>
                  )}
                  <div className="bg-slate-900 w-full h-full rounded-[14px] p-4 flex flex-col items-center text-center">
                    <div className="text-4xl mb-2 filter drop-shadow-md">{creature.emoji}</div>
                    <span className="text-white font-bold text-sm leading-tight mb-1">{creature.name}</span>
                    <span className="text-xs font-bold text-white/50 uppercase">{creature.rarity}</span>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={creature.id} className="bg-gray-200 p-1 rounded-2xl shadow-inner border border-gray-300">
                  <div className="bg-gray-100 w-full h-full rounded-[14px] p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxwYXRoIGQ9Ik0wIDBMMCA0TDEgNEwxIDBaTTEgMUwyIDFMMiAyTDEgMlpNMCAyTDAgNEwxIDRMMSAyWk0yIDBMMiAyTDMgMkwzIDBaTTIgMkwyIDRMMyA0TDMgMloiIGZpbGw9IiNlN2U1ZTQiLz4KPC9zdmc+')] opacity-50" />
                    <div className="z-10 text-4xl mb-2 filter grayscale opacity-20 drop-shadow-none">{creature.emoji}</div>
                    <Lock size={16} className="text-gray-400 mb-1 z-10" />
                    <span className="text-gray-400 font-bold text-xs z-10 uppercase tracking-widest">Locked</span>
                    <span className="text-gray-400 text-[10px] mt-1 z-10 font-medium">Requires Grade {creature.threshold}</span>
                  </div>
                </div>
              );
            }
          })}
        </div>
        <p className="text-gray-500 text-sm font-medium text-center px-4">
          Higher grades reveal rarer creatures. Don't take shortcuts—embrace the complexity!
        </p>

        {renderCodexPopup()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans selection:bg-indigo-100 text-slate-900 pb-12">
      {gameState === 'setup' && renderSetup()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'results' && renderResults()}
      {gameState === 'codex' && renderCodex()}

      {/* Global API Key Settings Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-white">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                <Key size={26} />
              </div>
              <div>
                <h3 className="text-xl font-black">Google Gemini AI Settings</h3>
                <p className="text-xs text-slate-400">Powers 3D Card & Adventure Videos</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Enter your Google GenAI / Gemini API key. This is used by <code className="text-pink-400">gemini-2.5-flash</code> and <code className="text-indigo-400">veo-2.0-generate-001</code> to generate holographic foil cards and 3D action runs.
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500">
                Key is stored locally in your browser and used only for your video generation calls.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGeminiApiKey(tempApiKey);
                  localStorage.setItem('gemini_api_key', tempApiKey);
                  setShowApiKeyModal(false);
                }}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 rounded-xl text-xs font-extrabold text-white shadow-lg"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic 3D Adventure Celebration Modal */}
      <CelebrationModal
        creature={celebrationCreature}
        isOpen={Boolean(celebrationCreature)}
        onClose={() => {
          setCelebrationCreature(null);
          // Refresh cached video IDs
          getAllCachedVideoIds().then(setCachedVideoIds).catch(() => {});
        }}
        isCodexReplay={isCodexReplay}
        apiKey={geminiApiKey}
        onSaveApiKey={(key) => {
          setGeminiApiKey(key);
          setTempApiKey(key);
        }}
      />
    </div>
  );
}
