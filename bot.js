require("dotenv").config();
const Pino = require("pino");
const axios = require("axios");
const fs = require("fs");
const express = require("express");
const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require("@adiwajshing/baileys");

// ✅ Config
const GEMINI_KEY = process.env.GEMINI_KEY;
const SESSION_FILE = "./session.json";
let geminiMode = false;

// ✅ Express Server to Keep Render Alive
const app = express();
app.get("/", (req, res) => res.send("🚀 WhatsApp Gemini Bot is Running on Render!"));
app.listen(3000, () => console.log("✅ Express Server Started (Port 3000)"));

/**
 * Gemini AI Request
 */
async function askGemini(prompt) {
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from Gemini.";
  } catch (err) {
    console.error("❌ Gemini API Error:", err.response?.data || err.message);
    return "⚠️ Gemini API Error!";
  }
}

/**
 * Start WhatsApp Bot
 */
async function startBot() {
  const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: true
  });

  // ✅ Save session when updated
  sock.ev.on("creds.update", saveState);

  // ✅ Handle Connection Updates
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(`❌ Disconnected! Reason: ${reason}`);
      console.log("🔄 Reconnecting in 5 seconds...");
      setTimeout(startBot, 5000);
    } else if (connection === "open") {
      console.log("✅ WhatsApp Gemini Bot Connected Successfully!");
    }
  });

  // ✅ Message Handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    console.log(`💬 Message from ${from}: ${text}`);

    // ✅ Commands
    if (text.toLowerCase() === "!gemini on") {
      geminiMode = true;
      return sock.sendMessage(from, { text: "✅ Gemini Mode Activated!" });
    }
    if (text.toLowerCase() === "!gemini off") {
      geminiMode = false;
      return sock.sendMessage(from, { text: "❌ Gemini Mode Deactivated!" });
    }

    // ✅ AI Reply when Gemini Mode is ON
    if (geminiMode) {
      const reply = await askGemini(text);
      await sock.sendMessage(from, { text: reply });
    }
  });
}

// ✅ Start Bot
startBot();
