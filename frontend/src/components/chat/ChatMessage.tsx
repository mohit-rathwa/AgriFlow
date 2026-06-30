import ToolCallCard from './ToolCallCard';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, any>; result?: string }>;
  isLoading?: boolean;
  timestamp?: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-agri-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-agri-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-agri-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/** Simple markdown-ish renderer — handles bold, italic, code, headers, lists, and line breaks. */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeBlockLang = '';

  const processInline = (line: string, key: string): JSX.Element => {
    // Process inline formatting: bold, italic, inline code, links
    const parts: (string | JSX.Element)[] = [];
    // Regex for: **bold**, *italic*, `code`, [text](url)
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let partIdx = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[1]) {
        parts.push(<strong key={`${key}-b-${partIdx}`} className="font-semibold text-white">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`${key}-i-${partIdx}`} className="italic text-dark-200">{match[4]}</em>);
      } else if (match[5]) {
        parts.push(
          <code key={`${key}-c-${partIdx}`} className="px-1.5 py-0.5 bg-dark-700/80 rounded text-agri-400 text-[0.85em] font-mono">
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        parts.push(
          <a key={`${key}-a-${partIdx}`} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-agri-400 underline underline-offset-2 hover:text-agri-300 transition-colors">
            {match[8]}
          </a>
        );
      }
      lastIndex = match.index + match[0].length;
      partIdx++;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
    return <span key={key}>{parts.length > 0 ? parts : line}</span>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fences
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeLines = [];
        continue;
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden">
            {codeBlockLang && (
              <div className="bg-dark-700/80 px-3 py-1 text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
                {codeBlockLang}
              </div>
            )}
            <pre className="bg-dark-900/80 px-4 py-3 text-xs text-dark-200 overflow-x-auto font-mono leading-relaxed">
              {codeLines.join('\n')}
            </pre>
          </div>
        );
        continue;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty line → spacer
    if (trimmed === '') {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-white mt-3 mb-1">
          {processInline(trimmed.slice(4), `h3i-${i}`)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-white mt-3 mb-1">
          {processInline(trimmed.slice(3), `h2i-${i}`)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-white mt-3 mb-1">
          {processInline(trimmed.slice(2), `h1i-${i}`)}
        </h2>
      );
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 ml-1">
          <span className="text-agri-500 mt-0.5 flex-shrink-0">•</span>
          <span className="text-dark-200 text-sm leading-relaxed">{processInline(trimmed.slice(2), `lii-${i}`)}</span>
        </div>
      );
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s/);
    if (olMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex gap-2 ml-1">
          <span className="text-agri-500 font-semibold text-sm flex-shrink-0">{olMatch[1]}.</span>
          <span className="text-dark-200 text-sm leading-relaxed">{processInline(trimmed.slice(olMatch[0].length), `oli-${i}`)}</span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={`bq-${i}`} className="border-l-2 border-agri-500/50 pl-3 my-1 text-dark-300 text-sm italic">
          {processInline(trimmed.slice(2), `bqi-${i}`)}
        </div>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={`hr-${i}`} className="border-dark-700/50 my-3" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {processInline(line, `pi-${i}`)}
      </p>
    );
  }

  return elements;
}

export default function ChatMessage({ role, content, toolCalls, isLoading, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`max-w-[85%] lg:max-w-[75%] ${isUser ? 'order-1' : 'order-1'}`}>
        {/* Role label */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && (
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-agri-500 to-agri-700 flex items-center justify-center text-xs shadow-md shadow-agri-500/20 flex-shrink-0">
              🌾
            </div>
          )}
          <span className="text-[11px] font-medium text-dark-500 uppercase tracking-wider">
            {isUser ? 'You' : 'AgriFlow Agent'}
          </span>
          {timestamp && (
            <span className="text-[10px] text-dark-600">{timestamp}</span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-agri-600 to-agri-500 text-white shadow-lg shadow-agri-500/20'
              : 'glass-card text-dark-200'
          }`}
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <div className={isUser ? 'text-sm leading-relaxed' : ''}>
              {isUser ? content : renderMarkdown(content)}
            </div>
          )}
        </div>

        {/* Tool Calls */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {toolCalls.map((tc, idx) => (
              <ToolCallCard
                key={`${tc.name}-${idx}`}
                name={tc.name}
                args={tc.args}
                result={tc.result}
                status={tc.result ? 'complete' : 'running'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
