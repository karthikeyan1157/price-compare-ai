'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

export default function AIChatPanel() {
  const {
    chatMessages,
    addChatMessage,
    updateChatMessage,
    isChatTyping,
    setIsChatTyping,
    isChatOpen,
    setIsChatOpen,
    clearChat,
  } = useAppStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isChatTyping) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: msg,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');

    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };
    addChatMessage(assistantMsg);
    setIsChatTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: chatMessages.slice(-10) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = data?.error || 'Failed to get response from server';
        updateChatMessage(assistantMsg.id, `Error: ${err}`);
      } else {
        const content = data?.message || data?.content || '';
        if (content) {
          updateChatMessage(assistantMsg.id, content);
        } else {
          updateChatMessage(
            assistantMsg.id,
            "I'm sorry, I couldn't process that. Could you try rephrasing your question?",
          );
        }
      }
    } catch (e) {
      updateChatMessage(
        assistantMsg.id,
        "Sorry, I'm having trouble connecting. Please try again in a moment.",
      );
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsChatOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25 hover:bg-primary/90"
          size="icon"
        >
          <Bot className="h-6 w-6 text-primary-foreground" />
        </Button>
      </motion.div>

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-sm">AI Shopping Assistant</SheetTitle>
                  <SheetDescription className="text-xs">
                    Ask me anything about products & deals
                  </SheetDescription>
                </div>
              </div>
              {chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearChat}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 p-4">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">AI Shopping Assistant</p>
                    <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                      Ask me anything about products, deals, or shopping!
                    </p>
                    <div className="mt-4 space-y-2">
                      {[
                        'Best phone under ₹25,000?',
                        'When will iPhone 17 price drop?',
                        'Compare MacBook Air M4 prices',
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setInput(q);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          className="block w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-card border border-border/50',
                        )}
                      >
                        {msg.isLoading && !msg.content ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                            <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isChatTyping && chatMessages[chatMessages.length - 1]?.content && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/50 bg-card px-4 py-2.5">
                      <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about products, deals, or shopping!"
                rows={1}
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-border/50 bg-muted/50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                style={{
                  height: 'auto',
                  overflow: 'hidden',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isChatTyping}
                className="h-10 w-10 shrink-0 rounded-xl bg-primary p-0 text-primary-foreground hover:bg-primary/90"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}