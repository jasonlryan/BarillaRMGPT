const express = require("express");
const chatController = require("../controllers/chatController");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({ status: "Server is running" });
});

router.post("/chat", (req, res) => chatController.handleChat(req, res));
router.post("/reset_thread", (req, res) =>
  chatController.resetThread(req, res)
);

router.get("/api/config", (req, res) => {
  res.json({
    apiUrl:
      process.env.API_URL || `http://localhost:${process.env.PORT || 8080}`,
  });
});

// Add a test route to verify environment variables
router.get("/env-test", (req, res) => {
  res.json({
    apiKeySet: !!process.env.OPENAI_API_KEY,
    assistantIdSet: !!process.env.OPENAI_ASSISTANT_ID,
    organizationIdSet: !!process.env.OPENAI_ORGANIZATION_ID,
  });
});

module.exports = router;
