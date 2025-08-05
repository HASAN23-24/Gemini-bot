require("dotenv").config();
const { default: makeWASocket, useSingleFileAuthState } = require("@adiwajshing/baileys");
const axios = require("axios");
const express = require("express");
const fs = require("fs");

// ✅ Configurations
const GEMINI_KEY = process.env.GEMINI_KEY;
const SESSION_FILE = "./session.json";
let geminiMode = false;

// ✅ Express server (Render ke liye alive rakhta hai)
const app = express();
app.get("/", (req, res) => res.send("🚀 WhatsApp Gemini Bot is Running!"));
app.listen(3000, () => console.log("✅ Express server started on port 3000"));

// ✅ Gemini API Request Function
async function askGemini(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    return "⚠️ Gemini API Error!";
  }
}

// ✅ Start WhatsApp Bot
async function startBot() {
  const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true // Render logs me QR show karega
  });

  sock.ev.on("creds.update", saveState);
  console.log("✅ WhatsApp Gemini Bot Started!");

  // ✅ Listen incoming messages
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    console.log(`💬 Message from ${from}: ${text}`);

    // ✅ Toggle Gemini Mode
    if (text.toLowerCase() === "!gemini on") {
      geminiMode = true;
      return sock.sendMessage(from, { text: "✅ Gemini Mode ON!" });
    }
    if (text.toLowerCase() === "!gemini off") {
      geminiMode = false;
      return sock.sendMessage(from, { text: "❌ Gemini Mode OFF!" });
    }

    // ✅ AI Reply when Gemini Mode is ON
    if (geminiMode) {
      const reply = await askGemini(text);
      await sock.sendMessage(from, { text: reply });
    }
  });
}

startBot();
