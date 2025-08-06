require("dotenv").config();
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@adiwajshing/baileys");
const axios = require("axios");
const express = require("express");
const fs = require("fs");

const GEMINI_KEY = process.env.GEMINI_KEY;
const SESSION_FILE = "./session.json";
let geminiMode = false;

// ✅ Express server to keep Render alive
const app = express();
app.get("/", (req, res) => res.send("🚀 WhatsApp Gemini Bot Running!"));
app.listen(3000, () => console.log("✅ Express Server Active"));

async function askGemini(prompt) {
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return res.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    return "⚠️ Gemini API Error!";
  }
}

async function startBot() {
  const { state, saveState } = useSingleFileAuthState(SESSION_FILE);
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ Connection closed, Reason:", reason);
      console.log("🔄 Reconnecting...");
      setTimeout(startBot, 5000);
    } else if (connection === "open") {
      console.log("✅ Bot Connected Successfully!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    console.log(`💬 ${from}: ${text}`);

    if (text.toLowerCase() === "!gemini on") {
      geminiMode = true;
      return sock.sendMessage(from, { text: "✅ Gemini Mode Activated!" });
    }
    if (text.toLowerCase() === "!gemini off") {
      geminiMode = false;
      return sock.sendMessage(from, { text: "❌ Gemini Mode Deactivated!" });
    }

    if (geminiMode) {
      const reply = await askGemini(text);
      await sock.sendMessage(from, { text: reply });
    }
  });
}

startBot();
