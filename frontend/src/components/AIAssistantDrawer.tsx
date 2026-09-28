import React, { useState } from 'react';
import { X, Send, Bot, Sparkles, Wrench } from 'lucide-react';
import { api } from '../services/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  tools?: string[];
  reasoning?: string;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: "Hello! I am **MediSentinel AI**, your autonomous clinical inventory copilot. I monitor hospital stock 24x7, forecast demand spikes, and coordinate specialist multi-agent workflows. How can I assist you today?",
      tools: ['system_telemetry'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    "Which medicines run out in 7 days?",
    "Why is IV fluid high risk?",
    "Which ward has surplus inventory?",
    "Show medicines expiring soon"
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.sendChatMessage(query);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.reply,
        tools: res.tools_called,
        reasoning: res.agent_reasoning,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "I encountered a communication error with the agentic engine. Please verify the backend service is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#16171d] border-l border-white/[0.1] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.07] flex items-center justify-between bg-[#1c1d25]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center text-[#9484f7]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>Sentinel AI Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-[#9484f7]" />
            </h3>
            <p className="text-[10px] text-slate-400">LangGraph Multi-Agent RAG</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-3.5 border-b border-white/[0.07] bg-[#1c1d25]/60 flex flex-wrap gap-1.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white/[0.04] hover:bg-[#7c5cfc]/20 text-slate-300 hover:text-white border border-white/[0.07] hover:border-[#7c5cfc]/40 px-3 py-1 rounded-full transition-all"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] px-4 py-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#7c5cfc] text-white rounded-3xl rounded-br-sm shadow-md shadow-[#7c5cfc]/20 font-medium'
                  : 'bg-[#1c1d25] border border-white/[0.07] text-slate-200 rounded-3xl rounded-bl-sm shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {m.tools && m.tools.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/[0.05] flex flex-wrap items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-[#9484f7]" />
                  <span className="text-[10px] text-slate-400">Tools:</span>
                  {m.tools.map((t, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] text-[#c4b5fd] border border-white/[0.07]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-[#9484f7]">
            <span className="w-2 h-2 rounded-full bg-[#7c5cfc] animate-pulse"></span>
            <span>Querying telemetry and executing agent tools...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/[0.07] bg-[#1c1d25] flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about inventory, forecasts, suppliers..."
          className="flex-1 bg-[#16171d] border border-white/[0.08] focus:border-[#7c5cfc] rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 rounded-full bg-[#7c5cfc] hover:bg-[#8c6eff] disabled:opacity-50 text-white flex items-center justify-center shadow-lg shadow-[#7c5cfc]/20 transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
