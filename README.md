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
OBS_PASSWORD=your_obs_password
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

## ▶️ Running the Bot

```bash
node index.js
```

---

## ⚙️ Meme Configuration

Meme commands are defined in the `memes` array inside `index.js`:

```js
const memes = [
  {
    namespace: "emodmg",
    command: "!emodmg",
    sceneName: "Game Scene",
    sourceName: "emodmg_meme",
    duration: 5000,
    sceneItemId: null,
  },
];
```

* `command`: The chat trigger (e.g. `!emodmg`)
* `sourceName`: OBS source to show/hide
* `sceneName`: OBS scene that contains the source
* `duration`: Display time in milliseconds

---

## 🖥 OBS Setup

1. Open OBS Studio.
2. Enable WebSocket server (OBS 28+ includes it natively).
3. Add your meme overlays as sources in the correct scene.
4. Use the WebSocket password in your `.env`.

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