/**
 * Helper to format seconds as M:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface ExtractedFrame {
  base64: string;
  timestamp: number;
  timeLabel: string;
}

export interface ExtractedFramesResult {
  frames: ExtractedFrame[];
  duration: number;
  isLimited: boolean;
  limitMessage?: string;
}

/**
 * Extracts key frames from a video file at various intervals.
 * Captures frames from the video client-side using HTML5 canvas.
 */
export async function extractFrames(file: File): Promise<ExtractedFramesResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!duration || isNaN(duration)) {
          reject(new Error("Invalid video duration."));
          return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context is unavailable."));
          return;
        }

        let timestamps: number[] = [];
        let isLimited = false;
        let limitMessage: string | undefined;

        if (duration <= 30) {
          const interval = 3; // every 3 seconds
          for (let t = interval; t < duration; t += interval) {
            timestamps.push(t);
          }
          // Ensure we have at least 2 frames even if video is very short
          if (timestamps.length < 2) {
            timestamps = [duration * 0.25, duration * 0.75];
          }
        } else {
          // Video is longer than 30s. Limit to 10 representative key frames.
          const maxFrames = 10;
          isLimited = true;
          limitMessage = `The video is ${Math.round(duration)}s long. To maintain optimal speed, analysis is limited to ${maxFrames} representative frames.`;
          
          for (let i = 1; i <= maxFrames; i++) {
            timestamps.push(duration * (i / (maxFrames + 1)));
          }
        }

        const frames: ExtractedFrame[] = [];

        for (const time of timestamps) {
          await new Promise<void>((resolveSeek) => {
            video.currentTime = time;
            
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              try {
                const base64 = canvas.toDataURL("image/jpeg", 0.7);
                frames.push({
                  base64,
                  timestamp: time,
                  timeLabel: formatTime(time),
                });
              } catch (e) {
                console.error("Frame capture failed:", e);
              }
              resolveSeek();
            };
            
            video.addEventListener("seeked", onSeeked);
          });
        }

        URL.revokeObjectURL(fileUrl);
        resolve({
          frames,
          duration,
          isLimited,
          limitMessage,
        });
      } catch (err) {
        URL.revokeObjectURL(fileUrl);
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(fileUrl);
      reject(new Error("Unsupported video format or corrupted file."));
    };
  });
}
