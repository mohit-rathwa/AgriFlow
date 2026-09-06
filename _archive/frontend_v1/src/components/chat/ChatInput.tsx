import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const suggestions = [
  'Why did onion prices crash?',
  'Analyze transport delays',
  'Compare wheat vs rice ATE',
  'What-if: 50% cold chain',
];

export default function ChatInput({ onSend, disabled = false, placeholder = 'Ask the Intelligence Agent...' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 5 + 20; // 5 rows
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (disabled) return;
    onSend(suggestion);
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="space-y-3">
      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestionClick(s)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-dark-800/60 border border-dark-700/50 text-dark-300 hover:text-agri-400 hover:border-agri-500/30 hover:bg-agri-500/5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="relative flex items-end gap-3 bg-dark-800/60 backdrop-blur-xl border border-dark-700/50 rounded-2xl px-4 py-3 focus-within:border-agri-500/40 focus-within:ring-1 focus-within:ring-agri-500/20 transition-all duration-300">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-dark-100 placeholder-dark-500 text-sm resize-none focus:outline-none leading-6 min-h-[24px] max-h-[140px] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
            canSend
              ? 'bg-gradient-to-r from-agri-600 to-agri-500 text-white shadow-lg shadow-agri-500/25 hover:shadow-agri-500/40 hover:scale-105 active:scale-95'
              : 'bg-dark-700/50 text-dark-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-dark-600 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-dark-800/80 rounded text-dark-400 font-mono text-[10px]">Enter</kbd> to send · <kbd className="px-1.5 py-0.5 bg-dark-800/80 rounded text-dark-400 font-mono text-[10px]">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
