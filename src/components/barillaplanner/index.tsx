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
import "./streaming-styles.css";

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
  const abortControllerRef = useRef<AbortController | null>(null);
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
  }, []);

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

  // Add a cleanup function
  const cleanResponse = (text: string) => {
    return text
      .replace(/【.*?†source】/g, "") // Remove source markers
      .replace(/\[\d+\.\d+†source\]/g, "") // Remove numbered source markers
      .replace(/\[\d+†source\]/g, "") // Remove simple numbered source markers
      .replace(/【\d+:\d+†source】/g, "") // Remove indexed source markers
      .trim();
  };

  const handleStreamResponse = async (
    response: Response,
    initialMessage: string
  ) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    let currentMessage = "";
    const decoder = new TextDecoder("utf-8");
    let buffer = ""; // Add buffer for incomplete chunks

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Start streaming on first chunk
        if (!isStreaming) {
          setIsStreaming(true);
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

                // Clean and update the message content
                const cleanedMessage = cleanResponse(currentMessage);

                // Update the last message's content with the cleaned text
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (
                    newMessages[newMessages.length - 1].role === "assistant"
                  ) {
                    newMessages[newMessages.length - 1].content =
                      cleanedMessage;
                  } else {
                    newMessages.push({
                      role: "assistant",
                      content: cleanedMessage,
                    });
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore JSON parse errors from incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        handleError(error);
      }
    } finally {
      setIsStreaming(false);
      finishPerformanceTracking();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const messageText = input;
    setInput(""); // Clear input immediately
    await sendMessage(messageText);
  };

  const handleStarterClick = async (text: string) => {
    if (isLoading || isStreaming) return;
    await sendMessage(text);
  };

  const sendMessage = async (messageText: string) => {
    if (isLoading || isStreaming) return;

    try {
      setIsLoading(true);
      startPerformanceTracking();

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Add user message and empty assistant message
      setMessages((prev) => [
        ...prev,
        { role: "user", content: messageText },
        { role: "assistant", content: "" },
      ]);

      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await handleStreamResponse(response, messageText);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        handleError(error);
      }
    } finally {
      setIsLoading(false);
      finishPerformanceTracking();
      abortControllerRef.current = null;
    }
  };

  const handleRefresh = async () => {
    try {
      // Abort any ongoing stream
      if (abortControllerRef.current) {
        try {
          await abortControllerRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        } finally {
          abortControllerRef.current = null;
        }
      }

      // Reset all state first
      setIsLoading(false);
      setIsStreaming(false);
      setInput("");
      setAutoScroll(true);
      setMessages([]); // Clear messages immediately

      // Reset performance metrics
      performanceMetrics.current = {
        requestStart: 0,
        streamStart: 0,
        messageCount: 0,
        totalTokens: 0,
        lastUpdateTime: 0,
      };

      // Reset the backend thread
      const response = await fetch(`${API_URL}/reset_thread`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to reset thread: ${response.status}`
        );
      }

      await response.json();

      // Set welcome message from config
      setMessages([
        {
          role: "assistant",
          content: chatConfig.welcomeMessage,
        },
      ]);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        handleError(error);
      }
      // Ensure welcome message is shown even if reset fails
      setMessages([
        {
          role: "assistant",
          content: chatConfig.welcomeMessage,
        },
      ]);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-950 to-blue-900 text-white overflow-y-auto">
      <header className="flex-none flex items-center justify-between p-2 sm:p-4 bg-blue-800">
        <div className="flex items-center space-x-3">
          <img
            src="/Barilla-Logo.png"
            alt="Barilla logo"
            className="h-12 w-auto"
          />
          <h1 className="text-2xl font-bold">Retail Media Assistant</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col lg:flex-row gap-4 lg:gap-8">
        <Card className="flex-grow w-full lg:w-2/3 bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg flex flex-col max-h-[80vh]">
          <CardHeader className="flex-none py-4 px-6 flex flex-row justify-between items-center">
            <CardTitle className="text-xl">
              Chat with Retail Media Assistant
            </CardTitle>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="bg-blue-100 text-blue-900 hover:bg-blue-200 hover:text-blue-950 px-3 py-1.5 min-w-[90px] font-bold text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span>New Chat</span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4 pt-0 sm:pt-1">
            <div className="relative flex-1 flex flex-col min-h-0">
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                onClick={handleChatInteraction}
                onTouchStart={handleChatInteraction}
                className="chat-container overflow-y-auto"
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
                      className={`streaming-message ${
                        message.role === "assistant"
                          ? "assistant-message"
                          : "user-message"
                      }`}
                    >
                      {message.role === "assistant" &&
                      message.content === "" &&
                      isLoading &&
                      !isStreaming ? (
                        <div className="loading-container">
                          <LoadingDots />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : message.content ? (
                        <ReactMarkdown
                          className="markdown-container"
                          remarkPlugins={[remarkGfm]}
                          components={{
                            ul: ({ node, ...props }) => (
                              <ul
                                className="markdown-container ul"
                                {...props}
                              />
                            ),
                            ol: ({
                              node,
                              children,
                              ...props
                            }: {
                              node: any;
                              children: React.ReactNode;
                              [key: string]: any;
                            }) => {
                              // Cast props to any to safely delete optional properties
                              const safeProps = props as any;
                              delete safeProps.ordered;
                              delete safeProps.depth;

                              return (
                                <ol
                                  className="markdown-container ol"
                                  {...props}
                                >
                                  {children}
                                </ol>
                              );
                            },
                            li: ({ node, children, ...props }) => {
                              return (
                                <li
                                  className="markdown-container li"
                                  {...props}
                                >
                                  {children}
                                </li>
                              );
                            },
                            p: ({ node, ...props }) => (
                              <p className="markdown-container p" {...props} />
                            ),
                            h1: ({ node, ...props }) => (
                              <h1
                                className="markdown-container h1 text-yellow-400 font-bold mt-6 mb-3"
                                {...props}
                              />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2
                                className="markdown-container h2 text-yellow-400 font-bold mt-5 mb-3"
                                {...props}
                              />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3
                                className="markdown-container h3 text-yellow-400 font-medium mt-4 mb-2 text-base"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong
                                className="text-yellow-400 font-bold"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : null}
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
              className="flex-none mt-2 sm:mt-4 flex flex-col space-y-1"
              suppressHydrationWarning={true}
            >
              <div className="flex items-center space-x-2">
                <ChatInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onSubmit={handleSendMessage}
                  placeholder={
                    isLoading || isStreaming
                      ? "Please wait..."
                      : "Type your message..."
                  }
                  disabled={isLoading || isStreaming}
                  autoComplete="off"
                  autoCorrect="off"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  suppressHydrationWarning={true}
                  disabled={isLoading || isStreaming || !input.trim()}
                  className={`bg-[#E31837] text-white hover:bg-[#E31837]/90 min-w-[44px] min-h-[44px] ${
                    isLoading || isStreaming || !input.trim()
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-400 pl-1">
                Use Shift+Enter for a new line
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Mobile Conversation Starters - Shown only on small screens */}
        <div className="lg:hidden w-full overflow-y-auto pb-4">
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Sparkles className="mr-2 h-5 w-5 text-yellow-400" />
              Conversation Starters
            </summary>
            <div className="p-4 pt-4">
              <div className="space-y-3">
                {chatConfig.conversationStarters.map((starter, index) => (
                  <div key={index}>
                    <Button
                      variant="ghost"
                      onClick={() => handleStarterClick(starter.text)}
                      disabled={isLoading || isStreaming}
                      className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group ${
                        isLoading || isStreaming
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <div className="flex gap-1.5 items-start">
                        {React.createElement(getIcon(starter.icon), {
                          className:
                            "h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400",
                        })}
                        <span className="flex-1 whitespace-normal group-hover:text-yellow-400">
                          {starter.text}
                        </span>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* About This Project - Mobile */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg mt-4">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Heart className="mr-2 h-5 w-5 text-yellow-400" />
              About This Project
            </summary>
            <div className="p-4 pt-0">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Market Coverage
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.marketCoverage.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Reference Data Sources
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.referenceSources.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Analytical Frameworks
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.analyticalFrameworks.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Mobile Technical Details section */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg mt-4">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Globe className="mr-2 h-5 w-5 text-yellow-400" />
              Technical Details
            </summary>
            <div className="p-4 pt-0">
              <div className="space-y-4">
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Frontend
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.frontend.map((item, index) => (
                      <li key={index} className="leading-snug py-0">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Backend
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.backend.map((item, index) => (
                      <li key={index} className="leading-snug py-0">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Data Architecture
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.dataArchitecture.map(
                      (item, index) => (
                        <li key={index} className="leading-snug py-0">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Performance Features
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.performanceFeatures.map(
                      (item, index) => (
                        <li key={index} className="leading-snug py-0">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </details>

          {/* Mobile disclaimer */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg mt-4">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Flag className="mr-2 h-5 w-5 text-yellow-400" />
              Important Disclaimer
            </summary>
            <div className="p-4 pt-4">
              <p className="text-sm text-blue-100 leading-relaxed">
                {chatConfig.disclaimer}
              </p>
            </div>
          </details>
        </div>

        {/* Desktop Conversation Starters - Hidden on small screens */}
        <div className="hidden lg:flex lg:w-1/3 flex-col space-y-4 overflow-y-auto pb-4 max-h-[80vh]">
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Sparkles className="mr-2 h-5 w-5 text-yellow-400" />
              Conversation Starters
            </summary>
            <div className="p-4 pt-4">
              <div className="space-y-3">
                {chatConfig.conversationStarters.map((starter, index) => (
                  <div key={index}>
                    <Button
                      variant="ghost"
                      onClick={() => handleStarterClick(starter.text)}
                      disabled={isLoading || isStreaming}
                      className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3 group ${
                        isLoading || isStreaming
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
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
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Placeholder for About This Project section */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Heart className="mr-2 h-5 w-5 text-yellow-400" />
              About This Project
            </summary>
            <div className="p-4 pt-0">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Market Coverage
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.marketCoverage.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Reference Data Sources
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.referenceSources.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white mb-3 mt-5">
                      Analytical Frameworks
                    </h3>

                    <div className="space-y-2">
                      {chatConfig.aboutProject.analyticalFrameworks.map(
                        (item, index) => (
                          <div key={index}>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                handleStarterClick(item.chatPrompt)
                              }
                              disabled={isLoading || isStreaming}
                              className={`w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto py-0 px-2 min-h-0 group`}
                            >
                              <div className="flex gap-1.5 items-start">
                                <span className="text-yellow-400 font-bold text-xs flex-shrink-0 mt-0.5">
                                  •
                                </span>
                                <span className="flex-1 whitespace-normal">
                                  <span className="text-yellow-400 font-bold group-hover:underline">
                                    {item.title}:
                                  </span>{" "}
                                  <span className="text-blue-100">
                                    {item.description}
                                  </span>
                                </span>
                              </div>
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Desktop Technical Details section */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Globe className="mr-2 h-5 w-5 text-yellow-400" />
              Technical Details
            </summary>
            <div className="p-4 pt-0">
              <div className="space-y-4">
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Frontend
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.frontend.map((item, index) => (
                      <li key={index} className="leading-snug py-0">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Backend
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.backend.map((item, index) => (
                      <li key={index} className="leading-snug py-0">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Data Architecture
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.dataArchitecture.map(
                      (item, index) => (
                        <li key={index} className="leading-snug py-0">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white mb-3 mt-5">
                    Performance Features
                  </h3>
                  <ul className="list-disc pl-6 space-y-1.5 text-sm text-blue-100">
                    {chatConfig.technicalDetails.performanceFeatures.map(
                      (item, index) => (
                        <li key={index} className="leading-snug py-0">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </details>

          {/* Desktop disclaimer */}
          <details className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg rounded-lg">
            <summary className="p-4 font-bold flex items-center cursor-pointer">
              <Flag className="mr-2 h-5 w-5 text-yellow-400" />
              Important Disclaimer
            </summary>
            <div className="p-4 pt-4">
              <p className="text-sm text-blue-100 leading-relaxed">
                {chatConfig.disclaimer}
              </p>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
