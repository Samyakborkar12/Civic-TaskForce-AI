import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Issue, CityMetrics } from '../types';
import { Send, Bot, Sparkles, User as UserIcon, HelpCircle, LayoutGrid, CalendarCheck, ShieldAlert, ArrowRight } from 'lucide-react';

interface AICopilotProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  issues: Issue[];
  metrics: CityMetrics;
}

export default function AICopilot({ lang, issues, metrics }: AICopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your Civic Taskforce Copilot. I analyze traffic patterns, vehicle telemetry logs, community reports, and municipal databases to protect city infrastructure. Ask me about **unsafe zones**, **predictive potholes**, **refuse overflow forecasts**, or **flood prevention advice**.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        "Which area is unsafe?",
        "Show pothole prediction",
        "Predict garbage overflow",
        "Are there flood warnings?"
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const payload = {
        messages: [...messages, userMsg].map((m) => ({ sender: m.sender, text: m.text })),
        currentIssues: issues,
        currentMetrics: metrics
      };

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Copilot endpoint error');
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || []
      };

      setMessages((prev) => [...prev, aiMsg]);

    } catch (e) {
      console.error(e);
      // Fallback message
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "I encountered an issue communicating with my core knowledge base. Let me provide a local summary: We currently monitor **5 active report sites**. The highest hazard is an **Exposed High Voltage Wire** on walkway near Rajiv Chowk Metro Gate 3. Road repair crews are assigned to a **Deep Pothole on Janpath Road**. Let me know if you would like me to detail these coordinates.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Explain electric wire hazard", "When is pothole scheduled?"]
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-text-main flex items-center justify-center sm:justify-start gap-3">
            <Bot className="w-8 h-8 text-brand-primary animate-pulse" />
            <span>Civic Predictive Copilot AI</span>
          </h1>
          <p className="mt-2 text-brand-text-sub">
            Consult the civic smart assistant on risk profiling, predictive maintenance, and city safety.
          </p>
        </div>

        {/* Health score badge */}
        <div className="inline-flex self-center items-center gap-3 bg-brand-success/10 border border-brand-success/20 px-4 py-2 rounded-2xl">
          <span className="w-2.5 h-2.5 bg-brand-success rounded-full animate-ping"></span>
          <div>
            <span className="text-xs text-brand-success font-semibold uppercase tracking-wider block">City Health</span>
            <span className="text-lg font-mono font-bold text-brand-success block">{metrics.healthScore}/100</span>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-brand-lg flex flex-col h-[600px]">
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div key={msg.id} className={`flex gap-4 ${isAI ? 'justify-start' : 'justify-end'}`}>
                {/* Avatar */}
                {isAI && (
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary flex-shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className="max-w-[75%]">
                  {/* Chat bubble */}
                  <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                    isAI 
                      ? 'bg-brand-bg text-brand-text-main rounded-tl-sm border border-brand-border' 
                      : 'bg-brand-primary text-white rounded-tr-sm shadow-brand-sm'
                  }`}>
                    {/* Render paragraph chunks elegantly */}
                    {msg.text.split('\n\n').map((para, pIdx) => (
                      <p key={pIdx} className={pIdx > 0 ? 'mt-3' : ''}>
                        {para.split('**').map((part, idx) => (
                          idx % 2 === 1 ? <strong key={idx} className="font-bold underline decoration-brand-primary/30">{part}</strong> : part
                        ))}
                      </p>
                    ))}
                  </div>
                  
                  {/* Time */}
                  <span className="text-[10px] text-brand-text-sub mt-1.5 block">
                    {msg.timestamp}
                  </span>

                  {/* Suggestion Chips */}
                  {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {msg.suggestions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          id={`suggestion-${sIdx}`}
                          onClick={() => handleSendMessage(s)}
                          className="px-3.5 py-1.5 bg-brand-card border border-brand-border text-brand-text-main hover:border-brand-primary hover:text-brand-primary rounded-full text-xs font-semibold cursor-pointer shadow-brand-sm transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isAI && (
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center text-white flex-shrink-0 shadow-brand-sm">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Skeleton loading state */}
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary flex-shrink-0 animate-pulse">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="max-w-[70%] space-y-2">
                <div className="p-4 bg-brand-bg border border-brand-border text-brand-text-sub rounded-3xl rounded-tl-sm text-sm space-y-2">
                  <div className="h-3 bg-brand-border rounded-full w-48 animate-pulse"></div>
                  <div className="h-3 bg-brand-border rounded-full w-64 animate-pulse"></div>
                  <div className="h-3 bg-brand-border rounded-full w-32 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-brand-bg border-t border-brand-border flex gap-3">
          <input
            type="text"
            id="copilot-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage(inputText);
            }}
            placeholder="Ask AI Copilot for predictive insights..."
            className="flex-1 px-5 py-3 bg-brand-card border border-brand-border rounded-2xl text-sm focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 text-brand-text-main"
          />
          <button
            id="copilot-send"
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || loading}
            className="p-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl shadow-brand-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Built-in Prediction Simulation Indicators */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-card border border-brand-border p-5 rounded-3xl flex items-start gap-3 shadow-brand-sm">
          <LayoutGrid className="w-5 h-5 text-brand-warning mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm text-brand-text-main">Pothole Prediction Mode</h4>
            <p className="text-xs text-brand-text-sub mt-1">AI monitors asphalt integrity and heavy logistics routes for preventive maintenance scheduling.</p>
          </div>
        </div>
        <div className="bg-brand-card border border-brand-border p-5 rounded-3xl flex items-start gap-3 shadow-brand-sm">
          <CalendarCheck className="w-5 h-5 text-brand-success mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm text-brand-text-main">Refuse Overflow Alerts</h4>
            <p className="text-xs text-brand-text-sub mt-1">Monitors weekend congregation schedules and pedestrian telemetry to guide collection crews.</p>
          </div>
        </div>
        <div className="bg-brand-card border border-brand-border p-5 rounded-3xl flex items-start gap-3 shadow-brand-sm">
          <ShieldAlert className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm text-brand-text-main">Hydro Flood Mapping</h4>
            <p className="text-xs text-brand-text-sub mt-1">Predicts catch basin blockages ahead of storm events using historical drainage capacities.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
