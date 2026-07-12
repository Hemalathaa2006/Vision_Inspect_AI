import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON and URL-encoded parsers with large limits for image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Shared Gemini client utility (Lazy initialized)
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // --- API Routes ---

  // Inspection endpoint
  app.post("/api/inspect", async (req, res) => {
    try {
      const { image, images } = req.body;
      if (!image && (!images || !Array.isArray(images) || images.length === 0)) {
        return res.status(400).json({ error: "No image or video frame data provided" });
      }

      const imageParts = [];
      const isVideo = images && Array.isArray(images) && images.length > 0;

      if (isVideo) {
        for (const img of images) {
          let base64Data = img;
          let mimeType = "image/jpeg";
          if (img.startsWith("data:")) {
            const match = img.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }
          imageParts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      } else {
        let base64Data = image;
        let mimeType = "image/jpeg";
        if (image.startsWith("data:")) {
          const match = image.match(/^data:([^;]+);base64,(.*)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        }
        imageParts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            ...imageParts,
            {
              text: `You are a certified professional workplace safety inspector.
${isVideo ? "The uploaded assets are sequential key frames extracted from a workplace safety video. Analyze these video frames collectively for safety compliance and hazards, and output a single consolidated inspection report that represents the overall scene shown in the video." : "Analyze the uploaded image for safety compliance and hazards."}

Strictly adhere to these guidelines:
1. ONLY report hazards that are visually supported. Never invent hazards or extrapolate from unseen areas.
2. Highlight good safety practices whenever possible (e.g. wearing helmets, gloves, goggles, organized workspace, clean walkways).
3. If you are uncertain about something, say "Possible" or "Not clearly visible" instead of diagnosing.
4. Do not make references to specific OSHA regulation numbers or claim legal compliance or certification.
5. Provide:
   - A safety score (integer from 0 to 100), a letter grade (A, B, C, D, or F), and a status ("Safe", "Needs Attention", or "Hazardous").
   - A brief, punchy scene summary in simple language (STRICTLY maximum 40 words).
   - An AI Confidence rating (integer from 80 to 98) representing visual confidence.
   - An AI Verdict block (verdict status, visual reason, priority action).
   - A Risk Distribution block (Critical, Moderate, Low, Safe percentages).
   - A list of detected hazards, each with a title, severity ("Critical", "Moderate", or "Low"), issue description (STRICTLY max 15 words), explanation of why it matters (STRICTLY max 20 words), and recommended corrective actions (maximum 3 bullet points, no paragraphs).
   - For each hazard, identify its approximate coordinates in the image (x, y center, and width, height as percentages 0 to 100) relative to the representative frame.
   - A list of good safety practices observed, each with a title and specific bullet points (PPE detected, etc.).

This tool is a decision support system and does not replace a certified inspector.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              safetyScore: { type: Type.INTEGER, description: "Overall safety score out of 100" },
              grade: { type: Type.STRING, description: "Grade like A, B, C, D, F" },
              status: { type: Type.STRING, description: "Status: Safe, Needs Attention, or Hazardous" },
              sceneSummary: { type: Type.STRING, description: "Brief summary of scene, strictly max 40 words" },
              aiConfidence: { type: Type.INTEGER, description: "AI confidence level out of 100" },
              verdict: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING, description: "Verdict status like Unsafe, Safe, Needs Attention" },
                  reason: { type: Type.STRING, description: "Reason why, max 15 words" },
                  priority: { type: Type.STRING, description: "Action priority, e.g. Immediate inspection recommended" }
                },
                required: ["status", "reason", "priority"]
              },
              riskDistribution: {
                type: Type.OBJECT,
                properties: {
                  critical: { type: Type.INTEGER, description: "Percentage of critical risks, e.g. 40" },
                  moderate: { type: Type.INTEGER, description: "Percentage of moderate risks, e.g. 30" },
                  low: { type: Type.INTEGER, description: "Percentage of low risks, e.g. 20" },
                  safe: { type: Type.INTEGER, description: "Percentage of safe elements, e.g. 10" }
                },
                required: ["critical", "moderate", "low", "safe"]
              },
              detectedHazards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Name of hazard (e.g. Exposed Electrical Wiring)" },
                    severity: { type: Type.STRING, description: "Severity: Critical, Moderate, Low" },
                    issue: { type: Type.STRING, description: "Description of the hazard, strictly max 15 words" },
                    whyItMatters: { type: Type.STRING, description: "Impact of hazard, strictly max 20 words" },
                    recommendations: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Action items to fix, strictly max 3 items"
                    },
                    location: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.INTEGER, description: "Horizontal center coordinate, 0 to 100" },
                        y: { type: Type.INTEGER, description: "Vertical center coordinate, 0 to 100" },
                        width: { type: Type.INTEGER, description: "Box width as percentage, 10 to 40" },
                        height: { type: Type.INTEGER, description: "Box height as percentage, 10 to 40" }
                      },
                      required: ["x", "y", "width", "height"]
                    }
                  },
                  required: ["title", "severity", "issue", "whyItMatters", "recommendations", "location"]
                }
              },
              goodPractices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Good practice title, e.g. PPE Detected" },
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Specific good practices, e.g., helmet, gloves"
                    }
                  },
                  required: ["title", "items"]
                }
              }
            },
            required: ["safetyScore", "grade", "status", "sceneSummary", "detectedHazards", "goodPractices", "aiConfidence", "verdict", "riskDistribution"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from Gemini API");
      }

      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Inspection error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // Merge video frame reports endpoint
  app.post("/api/merge-video-reports", async (req, res) => {
    try {
      const { frameResults } = req.body;
      if (!frameResults || !Array.isArray(frameResults) || frameResults.length === 0) {
        return res.status(400).json({ error: "No frame inspection results provided for merging." });
      }

      const ai = getGeminiClient();
      const promptText = `You are a certified professional workplace safety inspector.
You are given a series of individual frame-level workplace safety inspection reports extracted from a video.
Each frame report contains safety scores, detected hazards, and good practices observed.
Analyze these individual reports collectively, and merge them into a single consolidated master safety report representing the overall scene shown in the video.

Below is the JSON data containing the frame inspection results in sequence:
${JSON.stringify(frameResults)}

In your final report, output a valid JSON following the schema below.
Ensure you strictly adhere to these guidelines:
1. ONLY include hazards that were detected in the frame reports. Never invent new hazards.
2. For each merged hazard:
   - Match it back to its original frame index and timestamp by setting 'frameIndex' and 'frameTimestamp'.
   - Maintain the approximate coordinates ('location') from the original hazard to support visual overlays.
3. Compute the overall safetyScore as an intelligent assessment of all frames (e.g. if there's a Critical hazard, the score should reflect that, not just a simple average of safe frames). Set grade and status accordingly.
4. Identify the 'highestRiskFrameIndex', 'highestRiskFrameTimestamp', and 'highestRiskFrameReason' (a brief sentence explaining why it's the highest risk, e.g. due to critical violations).
5. De-duplicate good safety practices and list them collectively.
6. Provide an overall 'sceneSummary' (maximum 40 words) summarizing the entire video.
7. List the overall corrective recommendations as a consolidated array of strings in the 'recommendations' field.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              safetyScore: { type: Type.INTEGER, description: "Overall combined safety score out of 100. Lower if critical risks exist." },
              grade: { type: Type.STRING, description: "Grade like A, B, C, D, F" },
              status: { type: Type.STRING, description: "Status: Safe, Needs Attention, or Hazardous" },
              sceneSummary: { type: Type.STRING, description: "Brief consolidated summary of the overall video, strictly max 40 words" },
              aiConfidence: { type: Type.INTEGER, description: "Overall confidence score out of 100" },
              verdict: {
                type: Type.OBJECT,
                properties: {
                  status: { type: Type.STRING, description: "Verdict status like Unsafe, Safe, Needs Attention" },
                  reason: { type: Type.STRING, description: "Reason why, max 15 words" },
                  priority: { type: Type.STRING, description: "Action priority, e.g. Immediate inspection recommended" }
                },
                required: ["status", "reason", "priority"]
              },
              riskDistribution: {
                type: Type.OBJECT,
                properties: {
                  critical: { type: Type.INTEGER, description: "Consolidated percentage of critical risks" },
                  moderate: { type: Type.INTEGER, description: "Consolidated percentage of moderate risks" },
                  low: { type: Type.INTEGER, description: "Consolidated percentage of low risks" },
                  safe: { type: Type.INTEGER, description: "Consolidated percentage of safe elements" }
                },
                required: ["critical", "moderate", "low", "safe"]
              },
              detectedHazards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    issue: { type: Type.STRING, description: "Description, max 15 words" },
                    whyItMatters: { type: Type.STRING, description: "Impact, max 20 words" },
                    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    location: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.INTEGER },
                        y: { type: Type.INTEGER },
                        width: { type: Type.INTEGER },
                        height: { type: Type.INTEGER }
                      },
                      required: ["x", "y", "width", "height"]
                    },
                    frameIndex: { type: Type.INTEGER, description: "The index of the frame where this was detected" },
                    frameTimestamp: { type: Type.STRING, description: "The timestamp string of the frame where this was detected" }
                  },
                  required: ["title", "severity", "issue", "whyItMatters", "recommendations", "location", "frameIndex", "frameTimestamp"]
                }
              },
              goodPractices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    items: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["title", "items"]
                }
              },
              highestRiskFrameIndex: { type: Type.INTEGER, description: "The 0-based index of the frame that is determined to have the highest risk" },
              highestRiskFrameTimestamp: { type: Type.STRING, description: "The timestamp of the highest risk frame" },
              highestRiskFrameReason: { type: Type.STRING, description: "The explanation of why this is the highest risk frame, max 30 words" },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Consolidated top 3-5 overall recommendations for the video" }
            },
            required: [
              "safetyScore", "grade", "status", "sceneSummary", "detectedHazards", "goodPractices", "aiConfidence", "verdict", "riskDistribution",
              "highestRiskFrameIndex", "highestRiskFrameTimestamp", "highestRiskFrameReason", "recommendations"
            ]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from Gemini API merging reports");
      }

      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Video merge error:", error);
      res.status(500).json({ error: error.message || "Failed to merge frame reports" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, image, inspection } = req.body;
      if (!message || !image || !inspection) {
        return res.status(400).json({ error: "Missing required fields message, image, or inspection" });
      }

      let base64Data = image;
      let mimeType = "image/jpeg";
      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const systemPrompt = `You are the VisionInspect AI Assistant.
Answer questions ONLY about the uploaded image and this safety inspection:
${JSON.stringify(inspection)}

If the user asks any question that is not directly about this image, this workplace, or this inspection, politely refuse, saying: "I can only answer questions related to this inspection."
Keep your answers brief, informative, and simple. Do not use technical jargon. Use short sentences.`;

      const contents = [];
      contents.push({
        role: "user",
        parts: [
          imagePart,
          { text: systemPrompt },
        ],
      });

      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.text }],
          });
        }
      }

      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
      });

      const reply = response.text;
      res.json({ reply });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  });

  // --- Serve Frontend ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
