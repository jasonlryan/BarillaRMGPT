// Define available icons
type IconName = string;

// Define object type for topics with title and chat prompt
interface TopicWithChat {
  title: string;
  description: string;
  chatPrompt: string;
}

export const chatConfig = {
  welcomeMessage:
    "👋 Welcome to the Barilla Retail Media Assistant! I'm here to help you with retail media insights, touchpoint effectiveness, shopper journey analysis, and more. How can I assist you today?",

  loginConfig: {
    password: 'rmgpt2025',
    message: 'Welcome to Barilla Retail Media GPT. Please enter the password to continue.',
    errorMessage: 'Incorrect password. Please try again.'
  },

  conversationStarters: [
    {
      icon: "Sparkles",
      text: "What are the most effective touchpoints for pasta in the US?",
    },
    {
      icon: "ShoppingCart",
      text: "How do shopper behaviors differ between France and Germany?",
    },
    {
      icon: "TrendingUp",
      text: "What are the top purchase triggers for biscuits in Greece?",
    },
    {
      icon: "Zap",
      text: "Show me the consumption occasions for pasta in Australia",
    },
    {
      icon: "BarChart",
      text: "What touchpoints have the highest ROI in Digital channels?",
    },
    {
      icon: "Search",
      text: "Compare online vs offline touchpoints for red sauce in France",
    },
  ],

  disclaimer:
    "This is a prototype assistant providing insights based on available Barilla retail media research data. Information may be limited to specific markets and time periods. For definitive guidance, please consult with your Barilla representative.",

  aboutProject: {
    referenceSources: [
      {
        title: "Category-Specific Data Files",
        description: "Specialized data for each product category including triggers, occasions, needs, and purchase behaviors",
        chatPrompt: "What category-specific data files are available and what insights can they provide?"
      },
      {
        title: "Vista Grande Hybrid Study",
        description: "US-specific pasta category research with 4,013 respondents, covering 77 retailers, 57 brands, and 557 products",
        chatPrompt: "Tell me about the Vista Grande Hybrid Study and how it can help with pasta retail media planning."
      },
      {
        title: "PDJ Omnichannel Report",
        description: "Global study across 20 countries with over 110,000 shopping missions, focusing on omnichannel behavior",
        chatPrompt: "What insights can I get from the PDJ Omnichannel Report about shopper behavior?"
      },
      {
        title: "Growth Framework",
        description: "Strategic framework for penetration growth with 8 key levers for brand building and commercial excellence",
        chatPrompt: "Explain the 8 key levers in the Growth Framework and how they apply to retail media."
      },
      {
        title: "PDJ Framework",
        description: "A framework mapping consumer behavior across awareness, consideration, purchase, and experience stages",
        chatPrompt: "Explain the People Decision Journey Framework and how it helps understand consumer decision-making."
      }
    ],
    marketCoverage: [
      {
        title: "Pasta Category",
        description: "Core markets include Australia, France, Germany, Greece, Switzerland, United States with additional coverage for Turkey and Italy",
        chatPrompt: "What data is available for pasta across different markets, especially in the US and Italy?"
      },
      {
        title: "Sauce Category",
        description: "Market data for France, Germany, and Italy across red sauce, pesto sauce, and meat sauce variants",
        chatPrompt: "Tell me about the sauce category data across European markets."
      },
      {
        title: "Biscuits Category",
        description: "Multi-market data with specialized purchase trigger and consumption occasion analysis",
        chatPrompt: "What insights are available about biscuits purchase triggers and consumption occasions?"
      },
      {
        title: "Dry Snacks Category",
        description: "Italian market focus with trigger and pairing behavior insights",
        chatPrompt: "What data do we have about dry snacks in Italy, including purchase triggers and pairing behaviors?"
      }
    ],
    analyticalFrameworks: [
      {
        title: "Unified Measurement Framework",
        description: "Structured metrics for awareness, consideration, purchase, and experience stages",
        chatPrompt: "Explain the Unified Measurement Framework and how it tracks the consumer journey."
      },
      {
        title: "Touchpoint Index",
        description: "Detailed information on channels, commercial purpose, and KPIs for all touchpoints",
        chatPrompt: "What is the Touchpoint Index and how can it help optimize retail media investments?"
      },
      {
        title: "Touchpoint Taxonomy",
        description: "Standardized categorization of digital and in-store touchpoints",
        chatPrompt: "Explain the Touchpoint Taxonomy and how it organizes different types of touchpoints."
      },
      {
        title: "Purchase Decision Hierarchy",
        description: "Specialized US market analysis of channel hierarchies and decision factors",
        chatPrompt: "Tell me about the Purchase Decision Hierarchy in the US market and its implications."
      }
    ]
  },

  technicalDetails: {
    frontend: [
      "Next.js React application with streaming UI",
      "Custom performance tracking for response monitoring", 
      "ReactMarkdown for rich response formatting",
      "Abort controllers for canceling in-flight requests"
    ],
    backend: [
      "OpenAI Assistant API integration via Edge runtime",
      "Thread-based conversation management with cookies",
      "Server-sent events (SSE) for streamed responses",
      "Error boundary handling at API layer"
    ],
    dataArchitecture: [
      "Structured JSON data files organized by product categories and markets",
      "Vector-based schema validation system",
      "Hierarchical data source prioritization",
      "Strict geographic validation rules"
    ],
    performanceFeatures: [
      "Response streaming for perceived performance improvement",
      "Optimized scroll management during streaming",
      "Token rate monitoring during response generation",
      "Debounced UI updates to prevent rendering bottlenecks"
    ]
  },

  demoScenario: [
    {
      title: "Data Exploration",
      description: "Query available data on dry snacks in Italy, including purchase triggers and pairing behaviors",
      chatPrompt: "What data do we have about dry snacks in Italy, including purchase triggers and pairing behaviors?"
    },
    {
      title: "Campaign Implications",
      description: "Understand the implications for retail media planning in the Italian market",
      chatPrompt: "What does this mean for a targeted retail campaign in Italy?"
    },
    {
      title: "Campaign Brief",
      description: "Create a detailed campaign brief using insights and touchpoint data",
      chatPrompt: "Please map out a campaign brief for Dry Snacks in Italy. Draw on these insights, plus touchpoint data for Italy for this category."
    },
    {
      title: "Agency Response",
      description: "Simulate an agency's response to the campaign brief",
      chatPrompt: "Reply to this brief as if from an agency."
    },
    {
      title: "Budget Allocation",
      description: "Develop a data-driven budget breakdown for the campaign",
      chatPrompt: "Based on the touchpoint data, create a budget breakdown for the campaign."
    },
    {
      title: "Budget Optimization",
      description: "Optimize a €50,000 budget allocation based on insights and touchpoint data",
      chatPrompt: "The budget is 50k - how will you allocate this. Base the weightings on insights and touchpoint data."
    },
    {
      title: "Growth Framework",
      description: "Align the campaign with the Barilla growth levers framework",
      chatPrompt: "How does this map to the growth levers?"
    },
    {
      title: "Measurement Planning",
      description: "Develop a measurement framework with key KPIs for campaign success",
      chatPrompt: "What should the measurement framework look like? What are the key KPIs?"
    },
    {
      title: "Performance Scorecard",
      description: "Create a comprehensive scorecard for tracking campaign performance",
      chatPrompt: "Create a scorecard."
    }
  ]
}; 