import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Send, RefreshCw, Pizza, Utensils, Flag, Heart, Globe } from 'lucide-react'

export default function BarillaPlanner() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-950 to-blue-900 text-white">
      <header className="flex items-center justify-between p-4 bg-blue-800">
        <div className="flex items-center space-x-2">
          <img 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Mhl4gR5FNu3HJu0BTkeSd4HOfooksy.png"
            alt="Barilla logo" 
            className="h-12 w-auto" 
          />
          <h1 className="text-2xl font-bold">Barilla Retail Media Planner</h1>
        </div>
        <Button variant="outline" className="bg-blue-100 text-blue-900 hover:bg-blue-200 hover:text-blue-950">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <Card className="flex-grow lg:w-2/3 bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle>Chat with Retail Media Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col">
            <div className="flex-grow overflow-y-auto mb-4 p-4 bg-blue-700/50 rounded-lg">
              <p className="mb-4">Welcome to the Barilla Retail Media Planning Assistant!</p>
              <p className="mb-4">I am here to help you develop and implement data-driven media plans tailored to Barilla's retail media strategies. My role includes:</p>
              <ul className="list-disc list-inside mb-4">
                <li>Providing insights into top-performing media touchpoints for various product categories and countries.</li>
                <li>Offering practical recommendations to help you optimize your marketing campaigns.</li>
                <li>Helping you interpret key metrics like Index and Deviation from Mean to assess touchpoint effectiveness.</li>
              </ul>
              <p>Please let me know how I can assist you today!</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input placeholder="Type your message..." className="flex-grow bg-blue-700/50 border-blue-600 text-white placeholder-blue-300" />
              <Button className="bg-[#E31837] text-white hover:bg-[#E31837]/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:w-1/3 space-y-4">
          <Card className="bg-blue-800/80 backdrop-blur-lg border-none text-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5" /> Conversation Starters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <Button variant="ghost" className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3">
                    <div className="flex gap-3 items-start">
                      <Pizza className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-normal">Analyze top-performing media channels for pasta products</span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3">
                    <div className="flex gap-3 items-start">
                      <Utensils className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-normal">Optimize campaign for sauce category in the US market</span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3">
                    <div className="flex gap-3 items-start">
                      <Flag className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-normal">Interpret key metrics for Italian market performance</span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3">
                    <div className="flex gap-3 items-start">
                      <Heart className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-normal">Suggest targeting strategies for health-conscious consumers</span>
                    </div>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-left hover:bg-blue-700/50 text-blue-100 h-auto min-h-[2.5rem] py-2 px-3">
                    <div className="flex gap-3 items-start">
                      <Globe className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-normal">Compare media effectiveness across different regions</span>
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
                While I aim to deliver accurate insights based on the data provided, it's important to note that as an AI assistant, I may occasionally provide information that could be incorrect or based on inferred reasoning. If data for a specific product category or country is unavailable, I will inform you and suggest available alternatives where possible. I am prohibited from inventing or fabricating data, and all insights are derived strictly from existing datasets. However, always verify critical information before making decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}