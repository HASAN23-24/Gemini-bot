# 🤖 WhatsApp Gemini AI Bot

### ✅ Features
- WhatsApp se message lo
- Gemini API se AI response bhejo

### 🔥 Setup
1. Node.js install karo
2. Packages install:
   ```bash
   name: WhatsApp Gemini Bot

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  run-bot:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Create .env File
        run: |
          echo "GEMINI_KEY=${{ secrets.GEMINI_KEY }}" > .env

      - name: Run Bot
        run: node bot.js
