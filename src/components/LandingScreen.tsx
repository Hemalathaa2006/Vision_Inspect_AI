import React, { useState, useRef, useEffect } from "react";
import { Upload, Shield, Image as ImageIcon, Camera, Video, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

interface LandingScreenProps {
  onImageUploaded: (base64Image: string, source: "Image" | "Live Camera") => void;
  onVideoSelected: (file: File) => void;
}

export default function LandingScreen({ onImageUploaded, onVideoSelected }: LandingScreenProps) {
  const [activeTab, setActiveTab] = useState<"IMAGE" | "CAMERA" | "VIDEO">("IMAGE");
  
  // Drag & drop state for Image
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Drag & drop state for Video
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Error and feedback states
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live Camera states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Start / Stop Live Camera Stream ---
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment" 
        },
        audio: false,
      });
      
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera unavailable. Try another device.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Clean up camera on tab change or component unmount
  useEffect(() => {
    if (activeTab === "CAMERA") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Capture Frame from active stream
  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(dataUrl);
        
        // Stop camera tracks immediately to freeze the frame resource
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleAnalyzeCaptured = () => {
    if (capturedImage) {
      onImageUploaded(capturedImage, "Live Camera");
    }
  };

  // --- Image Processing & Validation ---
  const handleProcessImage = (file: File) => {
    const validImageTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validImageTypes.includes(file.type)) {
      setImageError("Unsupported file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image file is too large. Limit is 10MB.");
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImageUploaded(reader.result, "Image");
      } else {
        setImageError("Unsupported file.");
      }
    };
    reader.onerror = () => {
      setImageError("Unsupported file.");
    };
    reader.readAsDataURL(file);
  };

  // --- Video Processing & Validation ---
  const handleProcessVideo = (file: File) => {
    // Standard extensions and mime-types for mp4, mov, avi, webm
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["mp4", "mov", "avi", "webm"];
    const validMimePrefixes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

    const isExtensionValid = fileExtension && validExtensions.includes(fileExtension);
    const isMimeValid = validMimePrefixes.some(prefix => file.type.startsWith(prefix) || file.type === prefix);

    if (!isExtensionValid && !isMimeValid) {
      setVideoError("Unsupported video format.");
      return;
    }

    // Limit video size slightly to ensure snappy browser frame-seeking
    if (file.size > 50 * 1024 * 1024) {
      setVideoError("Video file is too large. Please upload a video smaller than 50MB.");
      return;
    }

    setVideoError(null);
    onVideoSelected(file);
  };

  return (
    <div className="space-y-8 py-4 max-w-6xl mx-auto px-4 animate-fade-in" id="landing-screen-root">
      
      {/* Page Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4" id="hero-header">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-bold tracking-wide uppercase font-mono shadow-xs">
          <Shield className="w-4 h-4 text-blue-500 animate-pulse" />
          <span>Professional Inspection Hub</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-display tracking-tight text-slate-900 leading-tight">
          Visual Compliance <span className="text-blue-600">Decision Support</span>
        </h1>
        <p className="text-slate-600 font-sans font-light text-base leading-relaxed max-w-2xl mx-auto">
          Deploy Google Gemini Vision models to inspect workspace photos, live streams, and videos instantly. Highlight potential hazards and outline immediate safety corrections.
        </p>
      </div>

      {/* THREE INPUT SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto" id="input-cards-selectors">
        
        {/* Upload Image Selector Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("IMAGE");
            setImageError(null);
          }}
          className={`flex items-start gap-4 p-5 rounded-3xl border text-left transition-all duration-300
            ${activeTab === "IMAGE" 
              ? "bg-white border-blue-500 ring-2 ring-blue-50 shadow-md" 
              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 shadow-xs"}`}
          id="select-image-card"
        >
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors
            ${activeTab === "IMAGE" ? "bg-blue-600 text-white shadow-md shadow-blue-600/15" : "bg-slate-100 text-slate-500"}`}>
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Upload Image</h3>
            <p className="text-slate-400 text-xs font-light leading-snug">JPG, PNG, or JPEG</p>
          </div>
        </button>

        {/* Live Camera Selector Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("CAMERA");
            setCameraError(null);
          }}
          className={`flex items-start gap-4 p-5 rounded-3xl border text-left transition-all duration-300
            ${activeTab === "CAMERA" 
              ? "bg-white border-blue-500 ring-2 ring-blue-50 shadow-md" 
              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 shadow-xs"}`}
          id="select-camera-card"
        >
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors
            ${activeTab === "CAMERA" ? "bg-blue-600 text-white shadow-md shadow-blue-600/15" : "bg-slate-100 text-slate-500"}`}>
            <Camera className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Live Camera</h3>
            <p className="text-slate-400 text-xs font-light leading-snug">Inspect in real-time via webcam</p>
          </div>
        </button>

        {/* Upload Video Selector Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("VIDEO");
            setVideoError(null);
          }}
          className={`flex items-start gap-4 p-5 rounded-3xl border text-left transition-all duration-300
            ${activeTab === "VIDEO" 
              ? "bg-white border-blue-500 ring-2 ring-blue-50 shadow-md" 
              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 shadow-xs"}`}
          id="select-video-card"
        >
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors
            ${activeTab === "VIDEO" ? "bg-blue-600 text-white shadow-md shadow-blue-600/15" : "bg-slate-100 text-slate-500"}`}>
            <Video className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Upload Video</h3>
            <p className="text-slate-400 text-xs font-light leading-snug">MP4, MOV, AVI, WEBM</p>
          </div>
        </button>

      </div>

      {/* ACTIVE WORKSPACE AREA */}
      <div className="max-w-4xl mx-auto" id="active-workspace-panel">
        
        {/* TAB 1: UPLOAD IMAGE */}
        {activeTab === "IMAGE" && (
          <div className="space-y-4" id="image-workspace">
            <div
              id="dropzone-image"
              onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImage(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleProcessImage(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => imageInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 bg-white
                ${isDraggingImage ? "border-blue-500 bg-blue-50/40 scale-[1.005]" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/20"}
                ${imageError ? "border-red-300 bg-red-50/10" : ""}
                shadow-xs`}
            >
              <input
                type="file"
                ref={imageInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessImage(e.target.files[0]);
                  }
                }}
                accept=".jpg,.jpeg,.png"
                className="hidden"
              />

              <div className="space-y-5 max-w-sm mx-auto">
                <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800">Drag &amp; drop safety photo</h4>
                  <p className="text-slate-400 text-xs font-light">or click to choose image from device</p>
                </div>
                <div className="inline-flex gap-2 text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  <span>JPG</span><span>•</span><span>PNG</span><span>•</span><span>JPEG</span>
                </div>
              </div>
            </div>

            {imageError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm animate-fade-in" id="image-error-box">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Analysis Blocked</p>
                  <p>{imageError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE CAMERA WEBCAM */}
        {activeTab === "CAMERA" && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6" id="camera-workspace">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-800">Live Camera Visualizer</span>
              </div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-0.5 rounded-md">
                Active Stream
              </span>
            </div>

            {/* Error display if camera fails */}
            {cameraError ? (
              <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="font-bold text-slate-800 text-sm">Camera access requested</p>
                  <p className="text-xs text-slate-500 font-light">{cameraError}</p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera Stream</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Viewport Frame */}
                <div className="aspect-video max-h-[380px] w-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200 mx-auto shadow-inner flex items-center justify-center">
                  {capturedImage ? (
                    // Frozen captured image
                    <img
                      src={capturedImage}
                      alt="Captured scene frame"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Live streaming video element
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                  )}
                  
                  {/* Subtle stream indicator overlay */}
                  {!capturedImage && cameraStream && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-slate-900/80 text-white rounded-md text-[9px] font-bold font-mono tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span>LIVE PREVIEW</span>
                    </div>
                  )}
                </div>

                {/* Stream Actions Panel */}
                <div className="flex justify-center items-center gap-3" id="camera-controls">
                  {!capturedImage ? (
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Frame</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyzeCaptured}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer animate-pulse"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Analyze Captured Frame</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: UPLOAD VIDEO */}
        {activeTab === "VIDEO" && (
          <div className="space-y-4" id="video-workspace">
            <div
              id="dropzone-video"
              onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingVideo(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleProcessVideo(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => videoInputRef.current?.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 bg-white
                ${isDraggingVideo ? "border-blue-500 bg-blue-50/40 scale-[1.005]" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/20"}
                ${videoError ? "border-red-300 bg-red-50/10" : ""}
                shadow-xs`}
            >
              <input
                type="file"
                ref={videoInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessVideo(e.target.files[0]);
                  }
                }}
                accept=".mp4,.mov,.avi,.webm"
                className="hidden"
              />

              <div className="space-y-5 max-w-sm mx-auto">
                <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                  <Video className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800">Drag &amp; drop safety video</h4>
                  <p className="text-slate-400 text-xs font-light">or click to choose video from device</p>
                </div>
                <div className="inline-flex gap-2 text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  <span>MP4</span><span>•</span><span>MOV</span><span>•</span><span>AVI</span><span>•</span><span>WEBM</span>
                </div>
              </div>
            </div>

            {videoError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm animate-fade-in" id="video-error-box">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Analysis Blocked</p>
                  <p>{videoError}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
