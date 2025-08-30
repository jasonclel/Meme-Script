# Kick Chat Meme Bot with OBS Integration

This project is a Node.js bot that listens to chat commands from a [Kick](https://kick.com) livestream and triggers meme overlays in OBS using WebSocket integration.

---

## 🎉 Features

* Connects to a Kick channel's chat
* Responds to custom commands (e.g., `!emodmg`, `!godno`)
* Activates OBS scene item overlays for a set duration
* Cooldown system to prevent spamming

---

## 📦 Requirements

* Node.js (v18 or later recommended)
* OBS Studio with WebSocket server enabled (OBS WebSocket plugin or OBS 28+)
* Kick account
* `.env` file with auth credentials

---

## 🛠 Installation

**To turn a folder into a Git repo and push it:**

```bash
git init
git remote add origin https://github.com/yourusername/kick-chat-meme-bot.git
```

Or, to clone an existing GitHub repo:

```bash
git clone https://github.com/yourusername/kick-chat-meme-bot.git
cd kick-chat-meme-bot
```

Then install dependencies:

```bash
npm install
```

Create a `.env` file in the root:

```env
BEARER_TOKEN=your_kick_bearer_token
COOKIES=your_cookie_string
CHANNEL_NAME=your_channel_name
```

> ❗ **Important:** Be sure to add `.env` to your `.gitignore` to avoid exposing your credentials.

---

## 🔐 Getting Your Kick `BEARER_TOKEN` and `COOKIES`

1. Log in to [Kick.com](https://kick.com) in your browser.
2. Open **Developer Tools** (Right-click → Inspect or press `F12`).
3. Go to the **Network** tab and refresh the page.
4. Filter requests by **XHR** or **Fetch**.
5. Click a request like `/v2/channels` or `/v2/users/me`.
6. In the **Headers** tab:

   * Look for the `Authorization` header → copy the string after `Bearer ` → this is your `BEARER_TOKEN`
   * Look for the `Cookie` header → copy the entire value → this is your `COOKIES`

Paste both into your `.env` file.

---

## ▶️ Running the Stream Manager

### Method 1: Via Configuration Interface (Recommended)
1. Start the configuration server: `npm run config`
2. Open http://localhost:3000 in your browser
3. Use the "Start Stream Manager" button in the web interface

### Method 2: Direct execution
```bash
npm run stream-manager
```
or
```bash
node stream-manager.js
```

### Method 3: Using npm start
```bash
npm start
```

## 🎛️ Configuration Interface

This bot now includes a web-based configuration interface for managing memes:

### Running the Configuration Server
```bash
npm run config
```

Then open your browser to http://localhost:3000

### Features
- **🎛️ Stream Manager Control**: Start/stop the stream manager directly from the web interface
- **🔗 OBS Integration**: Copy the meme overlay URL for easy OBS setup
- **📁 File Browser**: Select meme files from anywhere on your system using a native file picker
- **➕ Meme Management**: Add, edit, and delete memes with custom commands and durations  
- **💾 Real-time Updates**: Changes are saved immediately to `memes.json`
- **📊 Status Monitoring**: See if the stream manager is running and control it remotely

The stream manager will automatically load memes from the configuration file when started.

---

## ⚙️ Meme Configuration

Memes are now configured through the web interface or directly in `memes.json`. Each meme has:

* `namespace`: Unique identifier for the meme
* `command`: The chat trigger (e.g. `!emodmg`)
* `filePath`: Absolute or relative path to the meme file
* `duration`: Display time in milliseconds

**Note**: The system now uses file paths instead of OBS sources. Files can be located anywhere on your system and are selected through the web interface file browser.

---

## 🖥 OBS Setup

**NEW: Browser Source Integration**

The bot now uses a single browser source in OBS instead of multiple individual sources:

1. Start the configuration server: `npm run config`
2. Open your browser to http://localhost:3000  
3. Copy the **Meme Overlay URL** from the interface: `http://localhost:3000/overlays/memes`
4. In OBS Studio, add a **Browser Source** to your scene
5. Set the URL to the copied overlay URL
6. Set Width: 1920, Height: 1080 (or your stream resolution)
7. Check "Shutdown source when not visible" and "Refresh browser when scene becomes active"

**File Management:**
- Use any location on your system - no need to copy files to a specific folder
- Use the web interface file browser to select meme files from anywhere on your computer
- Supported formats:
  - **Images**: .gif, .jpg, .png, .webp, .svg, .bmp
  - **Videos**: .mp4, .webm, .mov, .avi, .mkv, .flv, .m4v
  - **Audio**: .mp3, .wav, .ogg, .aac, .m4a

---

## 🧊 Cooldown Logic

To prevent spamming, commands have a 10-second debounce window. This can be changed in `index.js`:

```js
const DEBOUNCE_TIME = 10 * 1000; // 10 seconds
```

---

## 📄 License

MIT

---

## 👤 Author

[Jason Lelieveld](https://github.com/jasonclel)