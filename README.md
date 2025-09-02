# tg-ai-reader

Smart Telegram news filter that uses artificial intelligence to select and forward interesting content from multiple channels.

## Description

tg-ai-reader analyzes unread messages from a selected chat folder in Telegram, evaluates them using AI (Gemini), and forwards only interesting content to a specified channel or chat. The application automatically marks analyzed messages as read.

Content is filtered based on personalized interest criteria that you define in a configuration file.

You can choose between Google Gemini or Ollama (local LLM) for AI analysis.

## Features

- 📂 Read messages from a selected Telegram channels folder
- 🤖 Content analysis with Google Gemini AI
- 📊 Filtering based on interest threshold value (from 0 to 1)
- 📬 Forward interesting messages to a target channel
- ✅ Automatic marking of messages as read

- 🦙 Optional support for Ollama (local LLM)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tg-ai-reader.git
cd tg-ai-reader

# Install dependencies
bun install
```

## Configuration

Create a `.env` file in the project root with the following parameters:

```bash
# Telegram API (get from https://my.telegram.org/apps)
TG_API_ID=123456
TG_API_HASH=abcdef1234567890abcdef1234567890
TG_SESSION_STRING=  # Will be filled automatically on first run

# Name of the Telegram chat folder to monitor
TG_CHAT_FOLDER=AI

# Name of the channel to forward interesting messages to
TG_TARGET_CHANNEL=MyDigest

# AI API key (Google Gemini)
AI_KEY=your_gemini_api_key

# Interest threshold for messages (from 0 to 1)
POST_INTEREST_THRESHOLD=0.7

# Timeout between processing chats (in ms)
TIMEOUT=1000

# Ollama configuration (optional, for local LLM)
OLLAMA_HOST=127.0.0.1:11434
OLLAMA_MODEL=llama2
```

## Content Configuration

The application filters messages based on your personal interests. Create your personal criteria file:

1. Copy the example file to create your personalized version:
   ```bash
   cp src/config/prompts.example.json src/config/prompts.json
   ```
   
2. Edit `src/config/prompts.json` with your own interests:
   ```json
   {
     "interesting": [
       "Tech news",
       "AI advancements",
       "Your personal interests",
       "Your location or city"
     ],
     "uninteresting": [
       "Topics you want to ignore",
       "Boring categories"
     ]
   }
   ```
   
> **Note:** `prompts.json` is excluded from Git to keep your preferences private.

## Usage

```bash
# Run the application
bun start
```

First-time launch will require Telegram authorization via phone number and verification code.

## Technologies

- [Bun](https://bun.sh) - JavaScript runtime and package manager
- [GramJS](https://gram.js.org/) - Telegram client for JavaScript
- [Google Gemini AI](https://deepmind.google/technologies/gemini/) - AI model for text analysis
 - [Ollama](https://ollama.com/) - Local LLM for text analysis
