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

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: chatConfig.welcomeMessage,
      },
    ]);
  }, []); // Empty dependency array means this runs once on mount

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  };

  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      setShowScrollButtons(scrollHeight > clientHeight);

      if (!isAtBottom) {
        setAutoScroll(false);
      } else {
        setAutoScroll(true);
      }
    }
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      console.log("🚀 Starting message send:", input);
      setIsLoading(true);
      setIsStreaming(false);

      const userMessage: Message = {
        role: "user",
        content: input,
      };
      const loadingMessage: Message = {
        role: "assistant",
        content: "...",
      };
      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setInput("");

      console.log("📤 Sending request to:", `${API_URL}/chat`);
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
        }),
      });

      console.log(
        "📥 Response received:",
        response.status,
        response.statusText
      );
      const reader = response.body?.getReader();

      if (reader) {
        console.log("🎯 Starting stream reading");
        setIsStreaming(true);
        let currentMessage = "";
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log("✅ Stream complete");
            break;
          }

          const text = decoder.decode(value);
          console.log("🔍 Decoded text:", text);

          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log("📦 Parsed data:", data);
                if (data.token) {
                  currentMessage += data.token;
                  const assistantMessage: Message = {
                    role: "assistant",
                    content: currentMessage,
                  };
                  setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === "assistant") {
                      return [...prev.slice(0, -1), assistantMessage];
                    }
                    return [...prev, assistantMessage];
                  });
                }
              } catch (error: unknown) {
                console.error("❌ Error parsing stream data:", error);
                handleError(error);
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error("❌ Request failed:", error);
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
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

  const handleStarterClick = async (text: string) => {
    try {
      // Store the text temporarily
      const messageText = text;

      // Clear input first (to match normal send behavior)
      setInput("");

      // Add user message immediately
      const userMessage: Message = {
        role: "user",
        content: messageText,
      };
      const loadingMessage: Message = {
        role: "assistant",
        content: "...",
      };
      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      // Start loading state
      setIsLoading(true);
      setIsStreaming(false);

      // Send to backend
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
        }),
      });

      // Handle streaming response (same as handleSendMessage)
      const reader = response.body?.getReader();
      if (reader) {
        setIsStreaming(true);
        let currentMessage = "";
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  currentMessage += data.token;
                  const assistantMessage: Message = {
                    role: "assistant",
                    content: currentMessage,
                  };
                  setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === "assistant") {
                      return [...prev.slice(0, -1), assistantMessage];
                    }
                    return [...prev, assistantMessage];
                  });
                }
              } catch (error: unknown) {
                handleError(error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling starter click:", error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Add a cleanup function
  const cleanResponse = (text: string) => {
    return text
      .replace(/【.*?†source】/g, "")
      .replace(/\[\d+\.\d+†source\]/g, "")
      .trim();
  };

  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === "assistant") {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, content: lastMsg.content + data.token },
                    ];
                  }
                  return [...prev, { role: "assistant", content: data.token }];
                });
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

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
                      {isLoading &&
                      index === messages.length - 1 &&
                      message.role === "assistant" &&
                      message.content === "..." ? (
                        <LoadingDots />
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
                            code: (props) => (
                              <code
                                {...props}
                                className="bg-blue-900/50 rounded px-1"
                              />
                            ),
                            pre: (props) => (
                              <pre
                                {...props}
                                className="p-4 rounded-lg overflow-x-auto"
                              />
                            ),
                            h1: (props) => (
                              <h1
                                {...props}
                                className="text-xl font-bold mb-4 text-white"
                              />
                            ),
                            h2: (props) => (
                              <h2
                                {...props}
                                className="text-lg font-bold mb-3 text-white"
                              />
                            ),
                            h3: (props) => (
                              <h3
                                {...props}
                                className="text-base font-bold mb-2 text-yellow-400"
                              />
                            ),
                            h4: (props) => (
                              <h4
                                {...props}
                                className="text-base font-semibold mb-2 text-blue-100"
                              />
                            ),
                            ul: ({ ordered, node, className, ...props }) => (
                              <ul {...props} className={className} />
                            ),
                            ol: ({ ordered, node, className, ...props }) => (
                              <ol
                                {...props}
                                className={`list-decimal space-y-2 my-4 ml-4 ${
                                  className || ""
                                }`}
                              />
                            ),
                            li: ({ ordered, node, className, ...props }) => (
                              <li {...props} className={className} />
                            ),
                            strong: (props) => (
                              <strong
                                {...props}
                                className="text-yellow-400 font-semibold"
                              />
                            ),
                            p: (props) => (
                              <p {...props} className="mb-4 last:mb-0" />
                            ),
                          }}
                        >
                          {message.content}
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
                    onClick={scrollToTop}
                    className="bg-blue-600/70 hover:bg-blue-600"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={scrollToBottom}
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
