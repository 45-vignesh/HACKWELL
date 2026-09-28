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
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-[#D9E8E3] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-[#D9E8E3] flex items-center justify-between bg-[#F3FAF7]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#006B4F]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#12332C] flex items-center space-x-1.5">
              <span>Sentinel AI Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-[#008F83]" />
            </h3>
            <p className="text-[10px] text-[#647772]">LangGraph Multi-Agent RAG</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#D9E8E3]/60 hover:bg-[#D9E8E3] text-[#647772] hover:text-[#12332C] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-3.5 border-b border-[#D9E8E3] bg-[#F3FAF7]/50 flex flex-wrap gap-1.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] bg-white hover:bg-[#008F83]/10 text-[#12332C] hover:text-[#006B4F] border border-[#D9E8E3] hover:border-[#008F83] px-3 py-1 rounded-full transition-all shadow-sm"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] px-4 py-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#006B4F] text-white rounded-3xl rounded-br-sm shadow-sm font-medium'
                  : 'bg-[#F3FAF7] border border-[#D9E8E3] text-[#12332C] rounded-3xl rounded-bl-sm shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>

              {m.tools && m.tools.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#D9E8E3] flex flex-wrap items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-[#008F83]" />
                  <span className="text-[10px] text-[#647772]">Tools:</span>
                  {m.tools.map((t, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-white text-[#006B4F] border border-[#D9E8E3]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[#647772] mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-[#008F83]">
            <span className="w-2 h-2 rounded-full bg-[#006B4F] animate-pulse"></span>
            <span>Querying telemetry and executing agent tools...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#D9E8E3] bg-[#F3FAF7] flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about inventory, forecasts, suppliers..."
          className="flex-1 bg-white border border-[#D9E8E3] focus:border-[#006B4F] rounded-full px-4 py-2.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="w-9 h-9 rounded-full bg-[#006B4F] hover:bg-[#004D3A] disabled:opacity-50 text-white flex items-center justify-center shadow-md transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
