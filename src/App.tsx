import React, { useState } from "react";
import { Shield, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { InspectionResult } from "./types";
import LandingScreen from "./components/LandingScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultsScreen from "./components/ResultsScreen";
import { extractFrames } from "./utils/videoHelper";

export default function App() {
  const [screen, setScreen] = useState<"LANDING" | "LOADING" | "RESULTS">("LANDING");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputSource, setInputSource] = useState<"Image" | "Live Camera" | "Video" | null>(null);

  // New video-specific pipeline states
  const [videoPhase, setVideoPhase] = useState<"uploading" | "extracting" | "analyzing" | "merging" | null>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(3);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleImageUploaded = async (base64Image: string, source: "Image" | "Live Camera" = "Image") => {
    setImageBase64(base64Image);
    setScreen("LOADING");
    setInputSource(source);
    setError(null);

    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Inspection analysis failed. Please try again.");
      }

      const data: InspectionResult = await response.json();
      setInspectionResult(data);
      setScreen("RESULTS");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze workplace safety. Please verify your connection or try again.");
      setScreen("LANDING");
    }
  };

  const handleVideoSelected = async (file: File) => {
    setScreen("LOADING");
    setInputSource("Video");
    setVideoPhase("uploading");
    setError(null);

    try {
      // Simulate/buffer a small upload delay for UX appreciation
      await new Promise((r) => setTimeout(r, 1200));

      setVideoPhase("extracting");
      const extractionResult = await extractFrames(file);
      const { frames, duration, isLimited, limitMessage: limitMsg } = extractionResult;

      if (frames.length === 0) {
        throw new Error("Could not extract safety frames from video file.");
      }

      setTotalFrames(frames.length);
      if (isLimited && limitMsg) {
        setLimitMessage(limitMsg);
      }

      setVideoPhase("analyzing");
      const frameAnalyses = [];

      // Analyze each extracted frame individually using Gemini Vision sequentially
      for (let i = 0; i < frames.length; i++) {
        setCurrentFrame(i + 1);
        
        const response = await fetch("/api/inspect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: frames[i].base64 }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to analyze keyframe ${i + 1} from video.`);
        }

        const data: InspectionResult = await response.json();
        frameAnalyses.push({
          frameIndex: i,
          timestamp: frames[i].timeLabel,
          base64: frames[i].base64,
          result: data,
        });
      }

      setVideoPhase("merging");
      // Merge all frame findings into a single inspection summary
      const mergeResponse = await fetch("/api/merge-video-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ frameResults: frameAnalyses }),
      });

      if (!mergeResponse.ok) {
        const errData = await mergeResponse.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to compile the final safety report from frames.");
      }

      const mergedResult: InspectionResult = await mergeResponse.json();
      
      // Store findings for each frame inside the merged result for Results screen access
      mergedResult.videoFrames = frameAnalyses;

      // Use the first frame (or the highest risk frame if available) as initial visual reference image
      let defaultImage = frames[0].base64;
      if (mergedResult.highestRiskFrameIndex !== undefined && frames[mergedResult.highestRiskFrameIndex]) {
        defaultImage = frames[mergedResult.highestRiskFrameIndex].base64;
      }
      setImageBase64(defaultImage);
      
      setInspectionResult(mergedResult);
      setScreen("RESULTS");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze workplace safety video. Ensure format and codecs are standard.");
      setScreen("LANDING");
    }
  };

  const handleReset = () => {
    setImageBase64(null);
    setInspectionResult(null);
    setError(null);
    setInputSource(null);
    setVideoPhase(null);
    setCurrentFrame(1);
    setTotalFrames(3);
    setLimitMessage(null);
    setScreen("LANDING");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="app-root">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-100 shadow-sm/50 shrink-0 sticky top-0 z-50" id="header">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between" id="header-content">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset} id="logo-brand">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10" id="header-logo-icon">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg font-display tracking-tight text-slate-900">
                VisionInspect <span className="text-blue-600">AI</span>
              </span>
            </div>
          </div>

          {/* Quick tagline in header */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full" id="header-tagline-tag">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Visual Safety Inspection Assistant</span>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col justify-center" id="main-container">
        {/* Error Notification message if inspection fails */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-3xl flex items-start gap-3 text-sm animate-in fade-in duration-300" id="app-level-error">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">Inspection Failed</p>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-medium text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Dynamic Screen routing based on app State */}
        {screen === "LANDING" && (
          <LandingScreen 
            onImageUploaded={handleImageUploaded} 
            onVideoSelected={handleVideoSelected}
          />
        )}

        {screen === "LOADING" && (
          <LoadingScreen 
            inputSource={inputSource} 
            videoPhase={videoPhase}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            limitMessage={limitMessage}
          />
        )}

        {screen === "RESULTS" && inspectionResult && imageBase64 && (
          <ResultsScreen
            result={inspectionResult}
            imageBase64={imageBase64}
            onReset={handleReset}
            inputSource={inputSource}
          />
        )}
      </main>

      {/* Footer disclaimer area */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 shrink-0 mt-12" id="footer">
        <div className="max-w-6xl mx-auto px-4 space-y-2" id="footer-content">
          <p className="font-medium" id="footer-brand">
            &copy; {new Date().getFullYear()} VisionInspect AI. Powered by Google Gemini Vision.
          </p>
          <p className="max-w-2xl mx-auto font-light leading-relaxed text-slate-400" id="footer-disclaimer">
            Disclaimer: This application is a decision support tool utilizing generative artificial intelligence. It is not a substitute for inspections conducted by qualified, certified safety professionals and does not claim regulatory or legal compliance.
          </p>
        </div>
      </footer>
    </div>
  );
}
