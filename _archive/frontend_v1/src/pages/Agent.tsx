import { useRef, useEffect } from 'react';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import { useAgentChat } from '../hooks/useAgent';

const exampleQuestions = [
  { icon: '📉', title: 'Price Analysis', question: 'Why did onion prices crash last quarter?' },
  { icon: '🚛', title: 'Transport Delays', question: 'Analyze transport delays in the supply chain' },
  { icon: '🧬', title: 'Causal Impact', question: 'Compare wheat vs rice average treatment effect' },
  { icon: '🧪', title: 'What-If Simulation', question: 'What-if: 50% cold chain coverage increase?' },
];

export default function Agent() {
  const { messages, isStreaming, sendMessage, clearHistory } = useAgentChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Intelligence Agent</h1>
          <p className="mt-1 text-dark-400">AI-powered supply chain analysis assistant</p>
        </div>
        {hasMessages && (
          <button
            onClick={clearHistory}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {!hasMessages ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Logo */}
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-agri-500 to-agri-700 flex items-center justify-center text-5xl shadow-2xl shadow-agri-500/30">
                  🌾
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
                  🤖
                </div>
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-3xl bg-agri-500/20 blur-2xl -z-10 animate-pulse-slow" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">AgriFlow Intelligence Agent</h2>
              <p className="text-dark-400 max-w-md mb-10 leading-relaxed">
                Ask me anything about your agricultural supply chain. I can analyze delays,
                predict risks, run simulations, and uncover causal insights.
              </p>

              {/* Example questions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {exampleQuestions.map((q) => (
                  <button
                    key={q.title}
                    onClick={() => sendMessage(q.question)}
                    className="glass-card-hover p-4 text-left group cursor-pointer"
                  >
                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform duration-200">{q.icon}</span>
                    <p className="text-sm font-semibold text-dark-200 group-hover:text-white transition-colors">{q.title}</p>
                    <p className="text-xs text-dark-500 mt-1 line-clamp-2">{q.question}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolCalls={msg.toolCalls}
                  isLoading={isStreaming && msg.role === 'assistant' && msg === messages[messages.length - 1] && !msg.content}
                  timestamp={msg.timestamp}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-dark-700/50 p-4 flex-shrink-0">
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}
            placeholder={isStreaming ? 'Agent is thinking...' : 'Ask the Intelligence Agent...'}
          />
        </div>
      </div>
    </div>
  );
}
