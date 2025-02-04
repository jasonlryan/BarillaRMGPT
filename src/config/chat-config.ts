// Define available icons
type IconName = string;

export const chatConfig = {
  welcomeMessage: `Welcome to the Barilla Retail Media Planning Assistant!

I can provide: 

• Insights into top-performing media touchpoints for various product categories and countries.
• Practical recommendations for optimizing retail media campaigns.
• General information about planning and evaluaiton using the PDJ.

How I can help you today?`,

  conversationStarters: [
    {
      icon: "Wheat" as IconName,
      text: "Analyze top-performing media channels for pasta products"
    },
    {
      icon: "Utensils" as IconName,
      text: "Optimize campaign for sauce category in the US market"
    },
    {
      icon: "Flag" as IconName,
      text: "Interpret key metrics for Italian market performance"
    },
    {
      icon: "Heart" as IconName,
      text: "Suggest targeting strategies for health-conscious consumers"
    },
    {
      icon: "Globe" as IconName,
      text: "Compare media effectiveness across different regions"
    }
  ],

  disclaimer: `I am instructed to only provide responses from Barilla datasets. However, as an AI assistant I sometiumes make mistakes. Always verify critical information before making decisions. If data for a specific product category or country is unavailable, I will inform you and suggest available alternatives where possible.`
}; 