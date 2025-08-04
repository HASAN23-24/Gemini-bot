require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState } = require("@adiwajshing/baileys");
const axios = require("axios");
const fs = require("fs");

const GEMINI_KEY = process.env.GEMINI_KEY;
let geminiMode = false; // 🔹 Default: Gemini mode off

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });

  sock.ev.on('creds.update', saveCreds);

  console.log("✅ Bot Started! QR scan (first time only). Use !gemini on/off to toggle AI mode.");

  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m.message || m.key.fromMe) return;

    const from = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text;

    if (!text) return;

    console.log(`📩 [${from}] → ${text}`);

    // ✅ Commands
    if (text.toLowerCase() === "!gemini on") {
      geminiMode = true;
      await sock.sendMessage(from, { text: "✅ Gemini Mode ON! 🤖" });
      return;
    }
    if (text.toLowerCase() === "!gemini off") {
      geminiMode = false;
      await sock.sendMessage(from, { text: "❌ Gemini Mode OFF! 🔕" });
      return;
    }

    // ✅ Gemini Mode Reply
    if (geminiMode) {
      const reply = await askGemini(text);
      await sock.sendMessage(from, { text: reply });
    }
  });
}

// 🔹 Gemini API Function
async function askGemini(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
    return "⚠️ Gemini API Error!";
  }
}

startBot();