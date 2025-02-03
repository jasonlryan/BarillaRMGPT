// Define available icons
type IconName = string;

export const chatConfig = {
  welcomeMessage: `Welcome to the Barilla Retail Media Planning Assistant!

I am here to help you develop and implement data-driven media plans tailored to Barilla's retail media strategies. My role includes:

• Providing insights into top-performing media touchpoints for various product categories and countries.
• Offering practical recommendations to help you optimize your marketing campaigns.
• Helping you interpret key metrics like Index and Deviation from Mean to assess touchpoint effectiveness.

Please let me know how I can assist you today!`,

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

  disclaimer: `While I aim to deliver accurate insights based on the data provided, it's important to note that as an AI assistant, I may occasionally provide information that could be incorrect or based on inferred reasoning. If data for a specific product category or country is unavailable, I will inform you and suggest available alternatives where possible. I am instructed to only provide responses from existing datasets. However, always verify critical information before making decisions.`
}; 