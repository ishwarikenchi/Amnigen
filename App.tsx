import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Sparkles, Loader2, Code, LayoutTemplate, Video } from 'lucide-react';
import { generateAnimationScript } from './services/geminiService';
import { AnimationScript, AnimationStep } from './types';
import { INITIAL_SCRIPT, SAMPLE_PROMPTS } from './constants';
import { AnimationStage } from './components/AnimationStage';

// Helper component for tooltips or steps list
const StepsPanel = ({ steps, currentStepIndex }: { steps: AnimationStep[]; currentStepIndex: number }) => (
  <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2">
    {steps.map((step, idx) => (
      <div 
        key={step.id}
        className={`p-3 rounded-lg border text-sm transition-colors duration-200 ${
          idx === currentStepIndex 
            ? 'bg-blue-900/30 border-blue-500/50 text-blue-100' 
            : 'bg-slate-800/50 border-slate-700 text-slate-400'
        }`}
      >
        <div className="flex justify-between mb-1">
          <span className="font-semibold text-xs uppercase tracking-wider opacity-70">Step {idx + 1}</span>
          <span className="text-xs opacity-50">{(step.duration / 1000).toFixed(1)}s</span>
        </div>
        <p>{step.description}</p>
      </div>
    ))}
  </div>
);

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<AnimationScript>(INITIAL_SCRIPT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setSeekTime(0);
    
    try {
      const newScript = await generateAnimationScript(prompt);
      setScript(newScript);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the animation.");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = useCallback((time: number, total: number) => {
    setCurrentTime(time);
    setTotalDuration(total);
    // Reset seek time once consumed
    setSeekTime(null);
  }, []);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const reset = () => {
    setIsPlaying(false);
    setSeekTime(0); // Force reset in stage
  };

  // Recording Logic
  const handleDownloadVideo = () => {
    if (!svgRef.current) return;
    if (isRecording) return;

    setIsRecording(true);
    setIsPlaying(false);
    setSeekTime(0);

    // Setup Canvas
    const canvas = document.createElement('canvas');
    canvas.width = script.canvas.width;
    canvas.height = script.canvas.height;
    const ctx = canvas.getContext('2d');
    canvasRef.current = canvas;

    if (!ctx) return;

    // Setup Recorder
    const stream = canvas.captureStream(30); // 30 FPS stream
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animgen-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      mediaRecorderRef.current = null;
      canvasRef.current = null;
    };

    recorder.start();
    mediaRecorderRef.current = recorder;

    // Start Playback which triggers frame capture in useEffect
    setTimeout(() => setIsPlaying(true), 100);
  };

  // Capture frame hook
  useEffect(() => {
    if (isRecording && isPlaying && svgRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Serialize SVG
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          ctx.fillStyle = script.canvas.backgroundColor;
          ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    }
  }, [currentTime, isRecording, isPlaying, script.canvas.backgroundColor]);

  // Stop recording when animation finishes
  useEffect(() => {
    if (isRecording && !isPlaying && currentTime >= totalDuration && totalDuration > 0) {
       // Allow last frame to draw
       setTimeout(() => {
         mediaRecorderRef.current?.stop();
       }, 500);
    }
  }, [isRecording, isPlaying, currentTime, totalDuration]);


  // Calculate current step index for UI highlighting
  const currentStepIndex = (() => {
    let accumulated = 0;
    for (let i = 0; i < script.steps.length; i++) {
      accumulated += script.steps[i].duration;
      if (currentTime < accumulated) return i;
    }
    return script.steps.length - 1;
  })();

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">AnimGen</h1>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">Beta</span>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleDownloadVideo}
                disabled={isRecording || loading}
                className={`p-2 rounded-md hover:bg-slate-800 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}
                title="Download Video"
             >
               {isRecording ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
             </button>
             <button 
                onClick={() => setShowCode(!showCode)}
                className={`p-2 rounded-md hover:bg-slate-800 transition-colors ${showCode ? 'text-blue-400' : 'text-slate-400'}`}
                title="View Generated Script"
             >
               <Code className="w-5 h-5" />
             </button>
             <a 
               href="https://ai.google.dev" 
               target="_blank" 
               rel="noreferrer" 
               className="text-xs text-slate-500 hover:text-blue-400 transition-colors"
             >
               Powered by Gemini
             </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid lg:grid-cols-[350px_1fr] gap-6">
        
        {/* Left Panel: Input & Context */}
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
          
          {/* Prompt Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-shrink-0">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Describe Concept</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Animate a circle expanding into a sphere..."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-3 placeholder:text-slate-600"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Animation
            </button>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          {/* Quick Prompts */}
          {!loading && (
            <div className="flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Try These</p>
              <div className="flex flex-col gap-2">
                {SAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="text-left text-xs p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-transparent hover:border-slate-700 truncate"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step Breakdown */}
          <div className="flex-1 min-h-0 flex flex-col">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">Scene Timeline</h3>
                <span className="text-xs text-slate-600">{script.steps.length} Steps</span>
             </div>
             <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-xl p-2">
               <StepsPanel steps={script.steps} currentStepIndex={currentStepIndex} />
             </div>
          </div>
        </div>

        {/* Right Panel: Animation Stage */}
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
          {/* Main Display */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl relative overflow-hidden flex flex-col">
            {/* Stage Title Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none">
              <h2 className="text-lg font-bold text-white shadow-sm">{script.title}</h2>
              <p className="text-sm text-slate-300 shadow-sm max-w-2xl">{script.description}</p>
            </div>
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-red-500/10 border border-red-500/50 px-3 py-1 rounded-full text-red-400 text-xs font-semibold animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                RECORDING
              </div>
            )}

            {/* Code Overlay (Toggle) */}
            {showCode && (
               <div className="absolute inset-0 z-20 bg-slate-950/95 p-6 overflow-auto font-mono text-xs text-green-400 backdrop-blur-sm">
                 <pre>{JSON.stringify(script, null, 2)}</pre>
               </div>
            )}

            {/* Rendering Engine */}
            <div className="flex-1 p-4 lg:p-8 flex items-center justify-center min-h-0">
               <AnimationStage 
                 ref={svgRef}
                 script={script} 
                 isPlaying={isPlaying} 
                 onTimeUpdate={handleTimeUpdate}
                 onFinished={() => setIsPlaying(false)}
                 seekTime={seekTime}
               />
            </div>

            {/* Controls */}
            <div className="h-16 bg-slate-900 border-t border-slate-800 flex items-center px-4 gap-4 z-10">
              <button 
                onClick={togglePlay}
                disabled={isRecording}
                className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              
              <button 
                onClick={reset}
                disabled={isRecording}
                className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <div className="flex-1 flex flex-col justify-center gap-1 group">
                 <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    <span>{(currentTime/1000).toFixed(1)}s</span>
                    <span>{(totalDuration/1000).toFixed(1)}s</span>
                 </div>
                 {/* Progress Bar */}
                 <div 
                   className={`h-1.5 bg-slate-800 rounded-full relative overflow-hidden ${isRecording ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                   onClick={(e) => {
                      if (isRecording) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = x / rect.width;
                      setSeekTime(pct * totalDuration);
                   }}
                 >
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-blue-500 rounded-full transition-all duration-100 ease-out" 
                      style={{ width: `${progressPercent}%` }}
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}