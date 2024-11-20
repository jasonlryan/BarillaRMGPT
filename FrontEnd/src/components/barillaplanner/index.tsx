"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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

export default function BarillaPlannerComponent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to the Barilla Retail Media Planning Assistant! How can I help you today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() === "") return;

    const newMessages = [
      ...messages,
      { role: "user", content: inputMessage },
      {
        role: "assistant",
        content:
          "Thank you for your message. As a mock-up, I can acknowledge your input but cannot provide a contextual response. How else can I assist you today?",
      },
    ];
    setMessages(newMessages);
    setInputMessage("");
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
          <h1 className="text-2xl font-bold">Barilla Retail Media Planner</h1>
        </div>
        <Button
          variant="outline"
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
          <CardContent className="flex-1 flex flex-col min-h-0 p-4">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto mb-4 p-4 bg-blue-700/50 rounded-lg"
            >
              <div className="mb-4">
                <p className="mb-4">
                  Welcome to the Barilla Retail Media Planning Assistant!
                </p>
                <p className="mb-4">
                  I am here to help you develop and implement data-driven media
                  plans tailored to Barilla's retail media strategies. My role
                  includes:
                </p>
                <ul className="list-disc list-inside mb-4">
                  <li>
                    Providing insights into top-performing media touchpoints for
                    various product categories and countries.
                  </li>
                  <li>
                    Offering practical recommendations to help you optimize your
                    marketing campaigns.
                  </li>
                  <li>
                    Helping you interpret key metrics like Index and Deviation
                    from Mean to assess touchpoint effectiveness.
                  </li>
                </ul>
                <p>Please let me know how I can assist you today!</p>
              </div>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      message.role === "user" ? "bg-blue-600" : "bg-blue-500"
                    }`}
                  >
                    {message.content}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex-none">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center space-x-2"
              >
                <Input
                  placeholder="Type your message..."
                  className="flex-grow bg-blue-700/50 border-blue-600 text-white placeholder-blue-300"
                  value={inputMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInputMessage(e.target.value)
                  }
                />
                <Button
                  type="submit"
                  className="bg-[#E31837] text-white hover:bg-[#E31837]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
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
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex gap-3 items-start">
                      <Pizza className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span className="flex-1 whitespace-normal">
                        Analyze top-performing media channels for pasta products
                      </span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex gap-3 items-start">
                      <Utensils className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span className="flex-1 whitespace-normal">
                        Optimize campaign for sauce category in the US market
                      </span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex gap-3 items-start">
                      <Flag className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span className="flex-1 whitespace-normal">
                        Interpret key metrics for Italian market performance
                      </span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex gap-3 items-start">
                      <Heart className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span className="flex-1 whitespace-normal">
                        Suggest targeting strategies for health-conscious
                        consumers
                      </span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3"
                  >
                    <div className="flex gap-3 items-start">
                      <Globe className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                      <span className="flex-1 whitespace-normal">
                        Compare media effectiveness across different regions
                      </span>
                    </div>
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg">
            <CardHeader>
              <CardTitle>Important Disclaimer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-100">
                While I aim to deliver accurate insights based on the data
                provided, it's important to note that as an AI assistant, I may
                occasionally provide information that could be incorrect or
                based on inferred reasoning. If data for a specific product
                category or country is unavailable, I will inform you and
                suggest available alternatives where possible. I am prohibited
                from inventing or fabricating data, and all insights are derived
                strictly from existing datasets. However, always verify critical
                information before making decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
