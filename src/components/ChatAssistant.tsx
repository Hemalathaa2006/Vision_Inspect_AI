import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, User, Sparkles } from "lucide-react";
import { ChatMessage, InspectionResult } from "../types";

interface ChatAssistantProps {
  imageBase64: string;
  inspectionResult: InspectionResult;
}

const SUGGESTED_QUESTIONS = [
  "Is this safe?",
  "Highest Risk",
  "Explain Hazard",
  "Repair Advice",
  "Summarize",
  "Generate Report"
];

export default function ChatAssistant({ imageBase64, inspectionResult }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! I am your VisionInspect AI Assistant. Click any of the quick suggestions below or ask any custom question about the scene's hazards, PPE, and safety actions.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    setError(null);
    const userMessageText = textToSend.trim();
    setInputValue("");

    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsTyping(true);

    try {
      // Map history for API payload
      const apiHistory = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          history: apiHistory,
          image: imageBase64,
          inspection: inspectionResult,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive response from AI server.");
      }

      const data = await response.json();
      
      const modelMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: data.reply || "I didn't receive a valid reply. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while communicating with the safety assistant.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[520px]" id="chat-assistant-container">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between animate-fade-in" id="chat-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/10">
            <MessageSquare className="w-4 h-4" id="chat-msg-icon" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display" id="chat-title">Ask VisionInspect AI</h4>
            <p className="text-[10px] text-slate-400 font-sans" id="chat-sub">Grounded safety analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono font-semibold" id="chat-status">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>ONLINE</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50" id="chat-message-list">
        {messages.map((msg) => {
          const isModel = msg.role === "model";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] ${isModel ? "" : "ml-auto flex-row-reverse text-right"}`}
              id={`chat-msg-${msg.id}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
                ${isModel ? "bg-white border-slate-100 text-blue-600 shadow-sm" : "bg-blue-600 border-blue-600 text-white"}`}
                id={`avatar-${msg.id}`}
              >
                {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className="space-y-1">
                <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed text-left shadow-sm
                  ${isModel ? "bg-white border border-slate-150/60 text-slate-800" : "bg-blue-600 text-white"}`}
                  id={`bubble-${msg.id}`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                <p className="text-[9px] text-slate-400 px-2 font-mono" id={`time-${msg.id}`}>{msg.timestamp}</p>
              </div>
            </div>
          );
        })}

        {/* Typing Loader */}
        {isTyping && (
          <div className="flex gap-3 max-w-[85%]" id="typing-loader">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-150/60 text-slate-800 px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}

        {/* Local Error notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-center gap-2" id="chat-error-banner">
            <span className="text-red-500">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Quick Action Chips (Displayed above input at all times) */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3" id="chat-actions">
        <div className="space-y-1.5" id="pills-wrapper">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">
            <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
            <span>AI Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-1.5" id="suggested-pills">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={isTyping}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl text-xs text-slate-600 hover:text-blue-700 transition-all font-sans font-medium cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="flex gap-2" id="input-bar">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isTyping}
            placeholder="Ask AI anything about the inspection..."
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded-2xl px-4 py-2 text-xs sm:text-sm outline-none transition-all placeholder:text-slate-400"
            id="chat-input-field"
          />
          <button
            type="button"
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 cursor-pointer"
            id="chat-send-btn"
          >
            <Send className="w-3.5 h-3.5" id="send-svg" />
          </button>
        </div>
      </div>
    </div>
  );
}
