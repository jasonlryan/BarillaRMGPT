const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

module.exports = { corsConfig };
