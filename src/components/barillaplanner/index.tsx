"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  RefreshCw,
  Pizza,
  Utensils,
  Flag,
  Heart,
  Globe,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import axios from "axios";
import { chatConfig } from "@/config/chat-config";
import * as Icons from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatInput from "./ChatInput";
import type { LucideIcon } from "lucide-react";
import type { LucideProps } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const getIcon = (iconName: string) => {
  const IconComponent = Icons[iconName as keyof typeof Icons];
  if (!IconComponent) {
    console.warn(`Icon ${iconName} not found`);
    return Icons.HelpCircle;
  }
  return IconComponent as LucideIcon;
};

const getApiUrl = () => {
  if (typeof window === "undefined") return "";
  return "/api"; // Use Next.js API routes
};

const API_URL = getApiUrl();

export default function BarillaPlannerComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const messageCache = useRef<{ [key: string]: Message }>({});
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const lastUserInteractionRef = useRef<number>(0);
  const performanceMetrics = useRef<{
    requestStart: number;
    streamStart: number;
    messageCount: number;
    totalTokens: number;
    lastUpdateTime: number;
  }>({
    requestStart: 0,
    streamStart: 0,
    messageCount: 0,
    totalTokens: 0,
    lastUpdateTime: 0,
  });

  // Performance monitoring functions
  const logPerformance = (metric: string, value: number) => {
    console.log(`📊 Performance - ${metric}: ${value}ms`);
  };

  const startPerformanceTracking = () => {
    performanceMetrics.current = {
      ...performanceMetrics.current,
      requestStart: performance.now(),
      messageCount: messages.length,
    };
  };

  const trackStreamPerformance = (tokenCount: number) => {
    const now = performance.now();
    if (!performanceMetrics.current.streamStart) {
      performanceMetrics.current.streamStart = now;
    }

    performanceMetrics.current.totalTokens += tokenCount;

    // Log streaming metrics every 50 tokens
    if (performanceMetrics.current.totalTokens % 50 === 0) {
      const streamDuration = now - performanceMetrics.current.streamStart;
      const tokensPerSecond =
        (performanceMetrics.current.totalTokens / streamDuration) * 1000;
      logPerformance("Tokens per second", Math.round(tokensPerSecond));
    }

    // Track UI update performance
    const timeSinceLastUpdate = now - performanceMetrics.current.lastUpdateTime;
    if (timeSinceLastUpdate > 100) {
      // Log slow UI updates
      logPerformance("Slow UI update detected", timeSinceLastUpdate);
    }
    performanceMetrics.current.lastUpdateTime = now;
  };

  const finishPerformanceTracking = () => {
    const endTime = performance.now();
    const totalDuration = endTime - performanceMetrics.current.requestStart;
    const streamDuration = endTime - performanceMetrics.current.streamStart;

    logPerformance("Total request duration", Math.round(totalDuration));
    logPerformance("Stream duration", Math.round(streamDuration));
    logPerformance(
      "Total tokens processed",
      performanceMetrics.current.totalTokens
    );

    // Reset metrics
    performanceMetrics.current.totalTokens = 0;
    performanceMetrics.current.streamStart = 0;
  };

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: chatConfig.welcomeMessage,
      },
    ]);
  }, []); // Empty dependency array means this runs once on mount

  // Improved scroll handling
  const scrollToBottom = (force = false) => {
    if (!chatContainerRef.current) return;

    const timeSinceLastInteraction =
      Date.now() - lastUserInteractionRef.current;
    const shouldSmooth = timeSinceLastInteraction > 100;

    if (autoScroll || force) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: shouldSmooth ? "smooth" : "auto",
      });
    }
  };

  const handleScrollToBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToBottom(true);
  };

  const handleScrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  };

  // Enhanced scroll event handler
  const handleScroll = () => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    const hasOverflow = scrollHeight > clientHeight;

    setShowScrollButtons(hasOverflow);

    // Only update autoScroll if user has interacted
    const timeSinceLastInteraction =
      Date.now() - lastUserInteractionRef.current;
    if (timeSinceLastInteraction > 100) {
      // Debounce user interaction
      setAutoScroll(isAtBottom);
    }
  };

  // Track user interaction with chat container
  const handleChatInteraction = () => {
    lastUserInteractionRef.current = Date.now();
  };

  // Update useEffect for message changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add scroll restoration on streaming state change
  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, do a final scroll to bottom
      scrollToBottom(true);
    }
  }, [isStreaming]);

  const handleError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `⚠️ Error: ${errorMessage}. Please try again.`,
      },
    ]);
    console.error("Error:", error);
  };

  const handleStreamResponse = async (
    response: Response,
    initialMessage: string
  ) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    setIsStreaming(true);
    let currentMessage = "";
    const decoder = new TextDecoder("utf-8");
    let buffer = ""; // Add buffer for incomplete chunks

    // Add the initial assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("✅ Stream complete");
          break;
        }

        // Decode and handle any buffered data
        const text = decoder.decode(value, { stream: true });
        buffer += text;
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the last incomplete chunk

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(5));
              if (data.token) {
                currentMessage += data.token;
                trackStreamPerformance(data.token.length);

                // Update the last message's content with the accumulated text
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = currentMessage;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing stream data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reading stream:", error);
      handleError(error);
    } finally {
      setIsStreaming(false);
      finishPerformanceTracking();
    }
  };

  const sendMessage = async (messageText: string) => {
    try {
      setIsLoading(true);
      startPerformanceTracking();

      // Add user message
      const userMessage: Message = { role: "user", content: messageText };
      const assistantMessage: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleStreamResponse(response, messageText);
    } catch (error) {
      console.error("❌ Request failed:", error);
      handleError(error);
    } finally {
      setIsLoading(false);
      finishPerformanceTracking();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageText = input;
    setInput(""); // Clear input immediately
    await sendMessage(messageText);
  };

  const handleStarterClick = async (text: string) => {
    await sendMessage(text);
  };

  // Add a cleanup function
  const cleanResponse = (text: string) => {
    return text
      .replace(/【.*?†source】/g, "")
      .replace(/\[\d+\.\d+†source\]/g, "")
      .trim();
  };

  const handleRefresh = async () => {
    try {
      setMessages([
        {
          role: "assistant",
          content: chatConfig.welcomeMessage,
        },
      ]);

      await fetch(`${API_URL}/reset_thread`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error refreshing chat:", error);
    }
  };

  const LoadingDots = () => (
    <div className="flex space-x-2">
      <div className="w-2 h-2 bg-blue-300 rounded-full animate-[bounce_1s_infinite]"></div>
      <div className="w-2 h-2 bg-blue-300 rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
      <div className="w-2 h-2 bg-blue-300 rounded-full animate-[bounce_1s_infinite_0.4s]"></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-blue-950 to-blue-900 text-white overflow-hidden">
      <header className="flex-none flex items-center justify-between p-4 bg-blue-800">
        <div className="flex items-center space-x-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Mhl4gR5FNu3HJu0BTkeSd4HOfooksy.png"
            alt="Barilla logo"
            className="h-12 w-auto"
          />
          <h1 className="text-2xl font-bold">Barilla Retail Media Assistant</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="bg-blue-100 text-blue-900 hover:bg-blue-200 hover:text-blue-950"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-row gap-8 min-h-0">
        <Card className="flex-grow lg:w-2/3 bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle>Chat with Retail Media Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 flex flex-col min-h-0">
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                onClick={handleChatInteraction}
                onTouchStart={handleChatInteraction}
                className="flex-1 overflow-y-auto p-4 bg-blue-700/50 rounded-lg"
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${
                      message.role === "assistant"
                        ? "flex justify-start"
                        : "flex justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.role === "assistant"
                          ? "bg-blue-600/70 text-white rounded-tl-none"
                          : "bg-white/10 text-blue-100 rounded-tr-none"
                      }`}
                    >
                      {message.role === "assistant" &&
                      message.content === "" ? (
                        <div className="flex items-center space-x-2 text-blue-300">
                          <LoadingDots />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <ReactMarkdown
                          className="prose prose-invert max-w-none prose-pre:bg-blue-900/50 prose-pre:border prose-pre:border-blue-700"
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: (props) => (
                              <div className="overflow-x-auto my-4">
                                <table
                                  {...props}
                                  className="border-collapse border border-blue-700 w-full"
                                />
                              </div>
                            ),
                            thead: (props) => (
                              <thead {...props} className="bg-blue-900/50" />
                            ),
                            th: (props) => (
                              <th
                                {...props}
                                className="border border-blue-700 px-4 py-2 text-left"
                              />
                            ),
                            td: (props) => (
                              <td
                                {...props}
                                className="border border-blue-700 px-4 py-2"
                              />
                            ),
                          }}
                        >
                          {message.content || " "}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {showScrollButtons && (
                <div className="absolute right-4 bottom-4 flex flex-col gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleScrollToTop}
                    className="bg-blue-600/70 hover:bg-blue-600"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleScrollToBottom}
                    className="bg-blue-600/70 hover:bg-blue-600"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <form
              onSubmit={handleSendMessage}
              className="flex-none mt-4 flex items-center space-x-2"
              suppressHydrationWarning={true}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                name="chat-input"
                type="text"
                data-form-type="other"
                aria-label="Chat input"
                suppressHydrationWarning={true}
                className="flex-grow bg-blue-700/50 border-blue-600 text-white placeholder-blue-300"
              />
              <Button
                type="submit"
                suppressHydrationWarning={true}
                className="bg-[#E31837] text-white hover:bg-[#E31837]/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="hidden lg:flex lg:w-1/3 flex-col space-y-4">
          <Card className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-yellow-400" />{" "}
                Conversation Starters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {chatConfig.conversationStarters.map((starter, index) => (
                  <li key={index}>
                    <Button
                      variant="ghost"
                      onClick={() => handleStarterClick(starter.text)}
                      className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3 group"
                    >
                      <div className="flex gap-3 items-start">
                        {React.createElement(getIcon(starter.icon), {
                          className:
                            "h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400",
                        })}
                        <span className="flex-1 whitespace-normal group-hover:text-yellow-400">
                          {starter.text}
                        </span>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg">
            <CardHeader>
              <CardTitle>Important Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-100">{chatConfig.disclaimer}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
