const express = require("express");
const session = require("express-session");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { corsConfig } = require("./middleware/cors");
const { sessionConfig } = require("./middleware/session");

// Load environment variables with explicit path
const result = dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log(".env file loaded successfully");
}

// Detailed environment check
console.log("\nDetailed Environment check:");
console.log(
  "OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY
    ? `Set (length: ${process.env.OPENAI_API_KEY.length})`
    : "Not set"
);
console.log(
  "OPENAI_ASSISTANT_ID:",
  process.env.OPENAI_ASSISTANT_ID || "Not set"
);
console.log(
  "OPENAI_ORGANIZATION_ID:",
  process.env.OPENAI_ORGANIZATION_ID || "Not set"
);
console.log("Current working directory:", process.cwd());

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors(corsConfig));
app.use(session(sessionConfig));

// Routes
app.use("/", routes);

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
