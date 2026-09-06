import { useState, useCallback, useRef } from 'react';

export interface ChatToolCall {
  name: string;
  args: Record<string, any>;
  result?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ChatToolCall[];
  timestamp: string;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Prepare assistant placeholder
    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);

    // Build history for context (exclude the new user message — it's sent as `message`)
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('http://localhost:8000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: content, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially-incomplete line in the buffer
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              switch (currentEvent) {
                case 'token':
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + (data.content || '') }
                        : m
                    )
                  );
                  break;

                case 'tool_call':
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: [
                              ...(m.toolCalls || []),
                              { name: data.name, args: data.args || {} },
                            ],
                          }
                        : m
                    )
                  );
                  break;

                case 'tool_result':
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantId) return m;
                      const updatedToolCalls = (m.toolCalls || []).map((tc) =>
                        tc.name === data.name && !tc.result
                          ? { ...tc, result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result) }
                          : tc
                      );
                      return { ...m, toolCalls: updatedToolCalls };
                    })
                  );
                  break;

                case 'done':
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: data.content || m.content }
                        : m
                    )
                  );
                  break;

                case 'error':
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: m.content || `⚠️ Error: ${data.message || 'Something went wrong'}`,
                          }
                        : m
                    )
                  );
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: m.content || `⚠️ Connection error: ${err.message || 'Failed to reach the agent'}`,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, clearHistory, stopStreaming };
}
