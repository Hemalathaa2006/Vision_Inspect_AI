import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Video } from "lucide-react";

interface LoadingStep {
  label: string;
  status: "completed" | "active" | "pending";
}

interface LoadingScreenProps {
  inputSource: "Image" | "Live Camera" | "Video" | null;
  videoPhase?: "uploading" | "extracting" | "analyzing" | "merging" | null;
  currentFrame?: number;
  totalFrames?: number;
  limitMessage?: string | null;
}

const STANDARD_STEPS = [
  { label: "Image Received", minProgress: 0 },
  { label: "Understanding Scene", minProgress: 20 },
  { label: "Detecting Hazards", minProgress: 45 },
  { label: "Calculating Score", minProgress: 70 },
  { label: "Preparing Report", minProgress: 90 },
];

export default function LoadingScreen({ 
  inputSource, 
  videoPhase = null, 
  currentFrame = 1, 
  totalFrames = 3,
  limitMessage = null
}: LoadingScreenProps) {
  const [fakeProgress, setFakeProgress] = useState(0);

  // Dynamic progress calculation based on the actual video parsing stages
  useEffect(() => {
    if (inputSource !== "Video") {
      // For images, increment fake progress gradually from 0 to 98%
      const progressInterval = setInterval(() => {
        setFakeProgress((prev) => {
          if (prev >= 98) return 98;
          const step = prev < 30 ? 10 : prev < 70 ? 7 : prev < 90 ? 4 : 1;
          return prev + step;
        });
      }, 250);
      return () => clearInterval(progressInterval);
    } else {
      // For video, calculate progress based on the actual API phases
      let targetProgress = 5;
      if (videoPhase === "uploading") {
        targetProgress = 10;
      } else if (videoPhase === "extracting") {
        targetProgress = 25;
      } else if (videoPhase === "analyzing") {
        const frameRatio = totalFrames > 0 ? (currentFrame - 0.5) / totalFrames : 0.5;
        targetProgress = Math.floor(25 + frameRatio * 55); // ranges 25% to 80%
      } else if (videoPhase === "merging") {
        targetProgress = 90;
      }

      // Smooth transition to target progress
      const transitionInterval = setInterval(() => {
        setFakeProgress((prev) => {
          if (prev < targetProgress) {
            return prev + 1;
          } else if (prev > targetProgress) {
            return prev - 1;
          }
          return prev;
        });
      }, 30);
      return () => clearInterval(transitionInterval);
    }
  }, [inputSource, videoPhase, currentFrame, totalFrames]);

  // Construct steps list
  let stepsList: LoadingStep[] = [];

  if (inputSource === "Video") {
    // 1. Uploading step
    stepsList.push({
      label: "Uploading Video...",
      status: videoPhase === "uploading" ? "active" : "completed",
    });

    // 2. Extracting step
    stepsList.push({
      label: "Extracting Frames...",
      status: videoPhase === "uploading" 
        ? "pending" 
        : videoPhase === "extracting" 
        ? "active" 
        : "completed",
    });

    // 3. Analyzing individual frames steps
    const numFrames = totalFrames || 3;
    for (let i = 1; i <= numFrames; i++) {
      let status: "completed" | "active" | "pending" = "pending";
      if (videoPhase === "analyzing") {
        if (currentFrame > i) {
          status = "completed";
        } else if (currentFrame === i) {
          status = "active";
        }
      } else if (videoPhase === "merging") {
        status = "completed";
      }
      stepsList.push({
        label: `Analyzing Frame ${i}...`,
        status,
      });
    }

    // 4. Generating Final Report step
    stepsList.push({
      label: "Generating Final Report...",
      status: videoPhase === "merging" ? "active" : videoPhase === "uploading" || videoPhase === "extracting" || videoPhase === "analyzing" ? "pending" : "completed",
    });
  } else {
    // Standard image steps mapped from the current progress
    stepsList = STANDARD_STEPS.map((step, idx) => {
      const isCompleted = fakeProgress >= step.minProgress;
      const isCurrent = fakeProgress >= step.minProgress && (idx === STANDARD_STEPS.length - 1 || fakeProgress < STANDARD_STEPS[idx + 1].minProgress);
      return {
        label: step.label,
        status: isCompleted ? "completed" : isCurrent ? "active" : "pending",
      } as LoadingStep;
    });
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-20 max-w-md mx-auto text-center px-4 animate-fade-in" id="loading-container">
      {/* Premium animated scanner design */}
      <div className="relative mb-8" id="spinner-wrapper">
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-40 animate-pulse"></div>
        <div className="relative w-28 h-28 flex items-center justify-center bg-white rounded-full border border-blue-500/10 shadow-lg">
          <Loader2 className="w-14 h-14 text-blue-600 animate-spin" id="spin-svg" />
          <div className="absolute text-[11px] font-bold font-mono text-blue-600 tracking-tighter">
            {fakeProgress}%
          </div>
        </div>
      </div>

      <div className="space-y-6 w-full text-left" id="loading-details">
        <div className="text-center space-y-1">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest font-mono" id="loading-header">
            {inputSource === "Video" ? "VIDEO PIPELINE ACTIVE" : "AI COGNITIVE ENGINE ACTIVE"}
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight font-display" id="rotating-status-message">
            {inputSource === "Video" ? "Analyzing Workplace Safety Video" : "Analyzing Workplace Safety"}
          </h2>
        </div>

        {/* Video Limit Alert Banner if applicable */}
        {inputSource === "Video" && limitMessage && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2 text-blue-800 text-xs animate-fade-in" id="video-limit-message-banner">
            <Video className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{limitMessage}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5" id="progress-meter-container">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-100" id="progress-track">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${fakeProgress}%` }}
              id="progress-bar-fill"
            ></div>
          </div>
        </div>

        {/* Animated Checkmarks List */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3.5 max-h-[380px] overflow-y-auto" id="loading-steps-list">
          {stepsList.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            
            return (
              <div
                key={idx}
                className={`flex items-center justify-between transition-all duration-300 ${
                  isCompleted || isActive ? "opacity-100" : "opacity-45"
                }`}
                id={`loading-step-${idx}`}
              >
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                  )}
                  <span className={`text-xs font-medium ${isActive ? "text-blue-600 font-bold" : "text-slate-700"}`}>
                    {step.label}
                  </span>
                </div>
                
                {isCompleted ? (
                  <span className="text-[10px] font-bold font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                    ✔ Checked
                  </span>
                ) : isActive ? (
                  <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                    Processing
                  </span>
                ) : (
                  <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full shrink-0">
                    Pending
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-slate-400 text-[11px] text-center font-light italic">
          Disclaimer: Inspection results are generated as a safety decision support tool and do not substitute certified audits.
        </p>
      </div>
    </div>
  );
}
