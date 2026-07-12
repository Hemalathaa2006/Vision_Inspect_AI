import React, { useState, useEffect } from "react";
import { Download, AlertTriangle, ShieldCheck, Info, ArrowLeft, ShieldAlert, Sparkles, HelpCircle, Eye, CheckCircle, X } from "lucide-react";
import { InspectionResult, DetectedHazard } from "../types";
import { generateSafetyPDF } from "../utils/pdfGenerator";
import ChatAssistant from "./ChatAssistant";

interface ResultsScreenProps {
  result: InspectionResult;
  imageBase64: string;
  onReset: () => void;
  inputSource: "Image" | "Live Camera" | "Video" | null;
}

export default function ResultsScreen({ result, imageBase64, onReset, inputSource }: ResultsScreenProps) {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  // Derive active values based on selected frame if we have a video source
  const isViewingFrame = selectedFrameIndex !== null;
  const activeFrame = isViewingFrame && result.videoFrames ? result.videoFrames[selectedFrameIndex] : null;

  const activeResult = activeFrame ? activeFrame.result : result;
  const activeImage = activeFrame ? activeFrame.base64 : imageBase64;

  const {
    safetyScore,
    grade,
    status,
    sceneSummary,
    detectedHazards,
    goodPractices,
    aiConfidence,
    verdict,
    riskDistribution
  } = activeResult;

  const [activeHazardIndex, setActiveHazardIndex] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Status configuration helper
  const getStatusConfig = () => {
    const s = status.toLowerCase();
    if (s.includes("safe")) {
      return {
        bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
        ring: "text-emerald-500",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: "✅",
        verdictIcon: "✔",
        verdictColor: "text-emerald-600 bg-emerald-50 border-emerald-100"
      };
    } else if (s.includes("attention") || s.includes("moderate") || s.includes("warning")) {
      return {
        bg: "bg-amber-50 border-amber-200 text-amber-800",
        ring: "text-amber-500",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: "⚠️",
        verdictIcon: "⚠",
        verdictColor: "text-amber-600 bg-amber-50 border-amber-100"
      };
    } else {
      return {
        bg: "bg-rose-50 border-rose-200 text-rose-800",
        ring: "text-rose-500",
        badge: "bg-rose-100 text-rose-700 border-rose-200",
        icon: "🚨",
        verdictIcon: "✘",
        verdictColor: "text-rose-600 bg-rose-50 border-rose-100"
      };
    }
  };

  const statusStyle = getStatusConfig();

  // Helper to construct solid confidence meter blocks (e.g. ████████░░)
  const getConfidenceBlocks = (conf: number) => {
    const totalBlocks = 10;
    const activeBlocks = Math.round((conf / 100) * totalBlocks);
    const filled = "█".repeat(activeBlocks);
    const empty = "░".repeat(totalBlocks - activeBlocks);
    return `${filled}${empty}`;
  };

  const handleDownloadPDF = () => {
    const filename = isViewingFrame 
      ? `safety-inspection-frame-${selectedFrameIndex + 1}.pdf`
      : "visioninspect-safety-report.pdf";
    generateSafetyPDF(activeResult, activeImage, filename);
  };

  return (
    <div className="space-y-8 py-4 max-w-6xl mx-auto px-4" id="results-screen-root">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5" id="top-action-bar">
        <div className="flex items-center gap-4" id="back-and-source">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium group cursor-pointer"
            id="back-btn"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>New Inspection</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/50 rounded-full text-xs font-semibold font-mono text-slate-500" id="source-badge">
            <span className="uppercase text-[9px] tracking-widest text-slate-400">Source:</span>
            <span className="text-blue-600 font-bold uppercase tracking-wide">{inputSource || "Image"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto" id="report-actions">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer"
            id="pdf-preview-btn"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Preview Report</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 shadow-sm shadow-blue-500/10 cursor-pointer"
            id="pdf-download-btn"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* IMPROVEMENT: Sequential Keyframe Gallery (Video Only) */}
      {inputSource === "Video" && result.videoFrames && result.videoFrames.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 animate-fade-in" id="video-keyframes-gallery">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-800 flex items-center gap-1.5">
                <span>📹</span> Sequential Keyframe Inspector
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any keyframe below to view its specific hazard overlay and localized safety metrics.
              </p>
            </div>
            {selectedFrameIndex !== null && (
              <button
                type="button"
                onClick={() => setSelectedFrameIndex(null)}
                className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                ← Return to Overall Report
              </button>
            )}
          </div>

          {/* Keyframe Horizontal Scroll List */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200" id="keyframes-scroll-container">
            {/* Overall Summary Card */}
            <button
              type="button"
              onClick={() => setSelectedFrameIndex(null)}
              className={`flex-none w-36 rounded-2xl p-3 border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer
                ${selectedFrameIndex === null 
                  ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20 shadow-xs" 
                  : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono tracking-wider text-slate-400 block uppercase">Consolidated</span>
                <span className="text-xs font-bold text-slate-800 block">Overall Summary</span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-mono">Score:</span>
                <span className="text-base font-black text-blue-600">{result.safetyScore}%</span>
              </div>
            </button>

            {/* Individual Frame Cards */}
            {result.videoFrames.map((frame, index) => {
              const isSelected = selectedFrameIndex === index;
              const hasCritical = frame.result.detectedHazards.some(h => h.severity.toLowerCase() === "critical");
              const hasModerate = frame.result.detectedHazards.some(h => h.severity.toLowerCase() === "moderate");
              
              let badgeColor = "bg-slate-100 text-slate-600 border border-slate-100";
              if (hasCritical) {
                badgeColor = "bg-rose-50 text-rose-700 border border-rose-100";
              } else if (hasModerate) {
                badgeColor = "bg-amber-50 text-amber-700 border border-amber-100";
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedFrameIndex(index)}
                  className={`flex-none w-38 rounded-2xl border p-2 text-left transition-all duration-200 flex flex-col gap-2 relative cursor-pointer group
                    ${isSelected 
                      ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20" 
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white"}`}
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                    <img 
                      src={frame.base64} 
                      alt={`Frame ${index + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-slate-900/80 text-white px-1.5 py-0.5 rounded-lg font-mono">
                      {frame.timestamp}
                    </span>
                  </div>

                  <div className="flex flex-col justify-between flex-1">
                    <span className="text-[10px] font-bold text-slate-800 truncate">Frame {index + 1}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-semibold text-slate-500 font-mono">Score: {frame.result.safetyScore}%</span>
                      {frame.result.detectedHazards.length > 0 && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono uppercase ${badgeColor}`}>
                          {frame.result.detectedHazards.length} Risk{frame.result.detectedHazards.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Frame Inspection Banner context if viewing a single frame */}
      {isViewingFrame && activeFrame && (
        <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-3xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in" id="active-frame-view-alert">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎬</span>
            <div>
              <p className="text-sm font-bold">Currently Viewing Keyframe {selectedFrameIndex + 1} ({activeFrame.timestamp}) Analysis</p>
              <p className="text-xs text-blue-600 font-light">Showing hazard highlights, score breakdown, and compliance findings specific to this video frame.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFrameIndex(null)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10"
          >
            Switch to Overall Video Report
          </button>
        </div>
      )}

      {/* Main content split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="results-grid">
        {/* LEFT COLUMN: Metric Gauges, Verdict, Risks, and Hazards */}
        <div className="lg:col-span-7 space-y-6" id="left-results-panel">
          
          {/* Quick Metrics Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="metric-dashboard-grid">
            
            {/* IMPROVEMENT 1: Premium AI Safety Gauge */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center justify-center relative overflow-hidden" id="safety-gauge-card">
              <div className="absolute top-3 right-3 text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                GAUGE 1.0
              </div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono mb-4">Overall Safety</p>
              
              <div className="relative w-36 h-36 flex items-center justify-center mb-3" id="gauge-visual">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Underlay shadow track */}
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className="text-slate-100"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Glowing active gauge ring */}
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    className={`${statusStyle.ring} transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={(2 * Math.PI * 60) * (1 - safetyScore / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-display">{safetyScore}%</span>
                  <span className="text-xs font-bold font-mono text-slate-500 tracking-wide uppercase">Grade {grade}</span>
                </div>
              </div>

              <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${statusStyle.bg}`} id="status-display">
                <span>{statusStyle.icon}</span>
                <span>{status}</span>
              </div>
            </div>

            {/* IMPROVEMENT 2: AI Verdict Card & IMPROVEMENT 3: AI Confidence Meter */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4" id="verdict-confidence-card">
              
              {/* Verdict */}
              <div className="space-y-2.5" id="verdict-wrapper">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">VisionInspect AI Verdict</span>
                </div>
                
                <div className={`p-3 rounded-2xl border ${statusStyle.verdictColor}`} id="verdict-bubble">
                  <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight mb-1">
                    <span>{statusStyle.verdictIcon}</span>
                    <span>{verdict.status}</span>
                  </div>
                  <p className="text-xs font-sans text-slate-600 leading-relaxed font-light">
                    {verdict.reason}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium font-mono mt-1 pt-1 border-t border-slate-100/30">
                    Priority: {verdict.priority}
                  </p>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="pt-2 border-t border-slate-50 space-y-1" id="confidence-wrapper">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-400 font-mono text-[10px] tracking-wider uppercase">AI Confidence</span>
                    <div className="relative inline-block cursor-help group" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      {showTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-lg leading-relaxed z-30">
                          Confidence indicates how certain the AI is about the visible findings. Do not confuse this with Safety Score.
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-600">{aiConfidence}%</span>
                </div>
                
                <div className="font-mono text-xs text-blue-500 tracking-tight select-none">
                  {getConfidenceBlocks(aiConfidence)}
                </div>
              </div>

            </div>
          </div>

          {/* IMPROVEMENT 6: Risk Distribution progress bars */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4" id="risk-distribution-card">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">Risk Distribution Profiles</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="distribution-progress-bars">
              {/* Critical risk */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">🔴 Critical Hazards</span>
                  <span className="font-mono text-slate-500">{riskDistribution.critical}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${riskDistribution.critical}%` }}></div>
                </div>
              </div>

              {/* Moderate risk */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">🟠 Moderate Hazards</span>
                  <span className="font-mono text-slate-500">{riskDistribution.moderate}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${riskDistribution.moderate}%` }}></div>
                </div>
              </div>

              {/* Low risk */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">🟡 Low/Minor Hazards</span>
                  <span className="font-mono text-slate-500">{riskDistribution.low}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${riskDistribution.low}%` }}></div>
                </div>
              </div>

              {/* Safe indicators */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">🟢 Safe Practices</span>
                  <span className="font-mono text-slate-500">{riskDistribution.safe}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${riskDistribution.safe}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Highest Risk Frame Callout (Video Only, Overall Report View) */}
          {inputSource === "Video" && selectedFrameIndex === null && result.highestRiskFrameIndex !== undefined && (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 space-y-3.5 animate-fade-in" id="highest-risk-frame-box">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-rose-600 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <span>🚨</span> Highest Risk Segment detected
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 font-mono uppercase tracking-wider border border-rose-150">
                  Frame {result.highestRiskFrameIndex + 1} ({result.highestRiskFrameTimestamp})
                </span>
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-semibold">
                "{result.highestRiskFrameReason}"
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedFrameIndex(result.highestRiskFrameIndex!)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-100/60 hover:bg-rose-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-rose-200"
                >
                  <span>🔍 Inspect Frame {result.highestRiskFrameIndex + 1} Details</span>
                </button>
              </div>
            </div>
          )}

          {/* Scene Summary */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-2" id="scene-summary-box">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
              {isViewingFrame ? `Frame ${selectedFrameIndex + 1} Scene Summary` : "Scene Summary Overview"}
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed italic">
              "{sceneSummary}"
            </p>
          </div>

          {/* Detected Hazards Section */}
          <div className="space-y-4" id="detected-hazards-section">
            <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <span className="text-rose-500">🔴</span> Detected Hazards List
            </h3>

            {detectedHazards.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl text-emerald-800 text-sm font-medium flex items-center gap-2">
                <span>✔</span> No safety hazards detected. Maintain safety standards!
              </div>
            ) : (
              <div className="space-y-4" id="hazards-list">
                {detectedHazards.map((hazard, index) => {
                  const isCritical = hazard.severity.toLowerCase() === "critical";
                  const isModerate = hazard.severity.toLowerCase() === "moderate";
                  
                  const severityBadge = isCritical
                    ? "bg-rose-50 text-rose-700 border-rose-100"
                    : isModerate
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-yellow-50 text-yellow-800 border-yellow-100";

                  const indicatorDot = isCritical ? "🔴" : isModerate ? "🟠" : "🟡";

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => setActiveHazardIndex(index)}
                      onMouseLeave={() => setActiveHazardIndex(null)}
                      className={`bg-white border rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 cursor-pointer
                        ${activeHazardIndex === index ? "border-blue-500 shadow-md scale-[1.01]" : "border-slate-100"}`}
                      id={`hazard-card-${index}`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{indicatorDot}</span>
                          <span>{hazard.title}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {selectedFrameIndex === null && hazard.frameTimestamp && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hazard.frameIndex !== undefined) {
                                  setSelectedFrameIndex(hazard.frameIndex);
                                }
                              }}
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 hover:border-blue-200 transition-all uppercase font-mono tracking-wider cursor-pointer"
                              title="Click to inspect this frame"
                            >
                              🎬 Frame {hazard.frameIndex !== undefined ? hazard.frameIndex + 1 : ""} ({hazard.frameTimestamp})
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${severityBadge} uppercase tracking-wider font-mono`}>
                            {hazard.severity}
                          </span>
                        </div>
                      </div>

                      {/* Issue & Why it matters descriptions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 mb-3" id={`hazard-descriptions-${index}`}>
                        <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                          <span className="font-semibold text-slate-700">Issue:</span> "{hazard.issue}"
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                          <span className="font-semibold text-slate-700">Why It Matters:</span> "{hazard.whyItMatters}"
                        </div>
                      </div>

                      {/* Corrective Action bullets */}
                      <div className="pt-2.5 border-t border-slate-100" id={`hazard-actions-${index}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Recommended Correction</span>
                        <ul className="mt-1 space-y-1 text-xs text-slate-600 pl-4 list-disc">
                          {hazard.recommendations.slice(0, 3).map((rec, rIdx) => (
                            <li key={rIdx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* IMPROVEMENT 5: Improved Good Safety Practices (green checks) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4" id="good-practices-card">
            <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <span className="text-emerald-500">🟢</span> Good Safety Practices Observed
            </h3>

            {goodPractices.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No specific good safety practices observed.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="practices-grid">
                {goodPractices.map((gp, index) => (
                  <div key={index} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{gp.title}</span>
                    </div>
                    <div className="space-y-1">
                      {gp.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-1.5 text-xs text-slate-600 font-sans">
                          <span className="text-emerald-600 text-[10px]">✅</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Visual overlay panel & Chat Assistant */}
        <div className="lg:col-span-5 space-y-6" id="right-results-panel">
          
          {/* IMPROVEMENT 4: Visual Hazard Highlights on Image */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3" id="visual-reference-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono px-1">Visual Reference Scene</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-150/60 px-2.5 py-0.5 rounded-full font-mono">
                Approximate hazard location
              </span>
            </div>

            <div className="relative w-full overflow-hidden bg-slate-900 rounded-2xl border border-slate-200" id="results-image-wrapper">
              <img
                src={activeImage}
                alt="Inspected workplace scene"
                className="w-full h-auto max-h-[400px] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />

              {/* Coordinate-based highlights */}
              {detectedHazards.map((hazard, index) => {
                if (!hazard.location) return null;
                const { x, y, width, height } = hazard.location;
                const isActive = activeHazardIndex === index;

                let overlayColor = "border-yellow-400 bg-yellow-400/10 shadow-[0_0_8px_rgba(250,204,21,0.4)]";
                if (hazard.severity.toLowerCase() === "critical") {
                  overlayColor = "border-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.5)]";
                } else if (hazard.severity.toLowerCase() === "moderate") {
                  overlayColor = "border-amber-500 bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.45)]";
                }

                // Map coordinates using style positions
                return (
                  <div
                    key={index}
                    className={`absolute border-2 rounded-lg transition-all duration-300 flex items-center justify-center cursor-pointer group
                      ${overlayColor}
                      ${isActive ? "ring-2 ring-white scale-105 z-20" : "opacity-80 z-10 hover:opacity-100"}`}
                    style={{
                      left: `${x - width / 2}%`,
                      top: `${y - height / 2}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    onMouseEnter={() => setActiveHazardIndex(index)}
                    onMouseLeave={() => setActiveHazardIndex(null)}
                    id={`image-highlight-${index}`}
                  >
                    <div className="absolute top-0 left-0 bg-slate-900/85 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-br rounded-tl truncate max-w-full">
                      #{index + 1} {hazard.title}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 text-center font-mono py-1 italic">
              * Hover over hazard list items or boxes on the image to cross-reference highlights.
            </p>
          </div>

          {/* Ask AI chat box component */}
          <div id="results-chat-box">
            <ChatAssistant imageBase64={activeImage} inspectionResult={activeResult} />
          </div>

          {/* General safety notice disclaimers */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-2 text-xs text-slate-500 leading-relaxed" id="results-disclaimer">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Safety Decision Support Notice</span>
            </div>
            <p>
              VisionInspect AI offers immediate automated workspace assessments based on machine vision interpretation.
            </p>
            <p className="font-semibold text-slate-700">
              This does not substitute standard regulations or professional evaluations. Ensure critical corrective fixes are authorized by a certified inspector.
            </p>
          </div>

        </div>
      </div>

      {/* IMPROVEMENT 8: PDF Report Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="preview-report-modal">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold font-display">Safety Report Interactive Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Mock Document Sheet */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-100 flex justify-center" id="modal-document-scroll">
              <div className="bg-white w-full max-w-[210mm] shadow-md border border-slate-200 p-8 space-y-6 font-sans text-left relative min-h-[297mm]">
                
                {/* Header Banner */}
                <div className="bg-slate-900 text-white p-6 -mx-8 -mt-8 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">VisionInspect AI</h2>
                    <p className="text-xs text-blue-300">Automated Visual Compliance &amp; Hazard Inspection Report</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="bg-blue-600 text-white p-3 rounded-xl text-center min-w-[100px]">
                    <p className="text-[9px] font-bold font-mono tracking-wider">SAFETY SCORE</p>
                    <p className="text-2xl font-black">{safetyScore}%</p>
                    <p className="text-[9px] font-bold font-mono uppercase">{status}</p>
                  </div>
                </div>

                {/* Section: Summary */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">I. EXECUTIVE SUMMARY</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans italic">
                    "{sceneSummary}"
                  </p>
                </div>

                {/* Grid Split: Visual Attachment & Good Practices */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Good Practices */}
                  <div className="bg-slate-50/50 border border-slate-150/60 p-4 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono block">II. COMMENDABLE PRACTICES</span>
                    <div className="space-y-3">
                      {goodPractices.map((gp, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-800">{gp.title}</p>
                          <div className="space-y-0.5">
                            {gp.items.map((item, idx) => (
                              <p key={idx} className="text-[10px] text-slate-600 flex items-center gap-1">
                                <span className="text-emerald-600">✓</span>
                                <span>{item}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image ref */}
                  <div className="bg-slate-50/50 border border-slate-150/60 p-4 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono block mb-2">III. INSPECTION IMAGE REFERENCE</span>
                    <img
                      src={activeImage}
                      alt="Ref"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                    <p className="text-[8px] text-slate-400 font-mono text-center mt-1">Approximate hazard spatial coordinates mapped</p>
                  </div>
                </div>

                {/* Section: Hazards */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">IV. DETECTED HAZARDS &amp; CORRECTIONS</span>
                  {detectedHazards.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No hazards detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {detectedHazards.map((hazard, index) => (
                        <div key={index} className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 flex gap-3 relative">
                          <div className="w-1 bg-rose-500 rounded-full" />
                          <div className="flex-1 space-y-1 text-[10px]">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-rose-900">{hazard.title}</p>
                              <span className="font-mono text-[8px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                {hazard.severity}
                              </span>
                            </div>
                            <p className="text-slate-600"><span className="font-bold text-slate-700">Issue:</span> {hazard.issue}</p>
                            <p className="text-slate-600"><span className="font-bold text-slate-700">Impact:</span> {hazard.whyItMatters}</p>
                            <p className="text-slate-600"><span className="font-bold text-slate-700">Correction:</span> {hazard.recommendations.join(" | ")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Highest Risk Frame (Video Only) */}
                {inputSource === "Video" && selectedFrameIndex === null && result.highestRiskFrameIndex !== undefined && (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-rose-600 tracking-wider font-mono block">V. CRITICAL VIDEO ANOMALY / HIGHEST RISK SEGMENT</span>
                    <p className="text-xs font-bold text-rose-900">
                      Frame {result.highestRiskFrameIndex + 1} ({result.highestRiskFrameTimestamp})
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      "{result.highestRiskFrameReason}"
                    </p>
                  </div>
                )}

                {/* Mock Signoffs */}
                <div className="pt-10 border-t border-slate-100 flex justify-between items-end text-[9px] text-slate-400 font-mono">
                  <div className="space-y-1">
                    <p>SYSTEM ASSISTANT ID: VISIONINSPECT_AI_v1</p>
                    <p>STATUS: UNPUBLISHED_PREVIEW</p>
                  </div>
                  <p className="text-right italic">Grounded inside Google Gemini</p>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
