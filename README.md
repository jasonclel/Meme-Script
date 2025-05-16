````markdown
# Kick Chat Meme Bot with OBS Integration

This project is a Node.js bot that listens to chat commands from a [Kick](https://kick.com) livestream and triggers meme overlays in OBS using WebSocket integration.

---

## 🎉 Features

- Connects to a Kick channel's chat
- Responds to custom commands (e.g., `!emodmg`, `!godno`)
- Activates OBS scene item overlays for a set duration
- Cooldown system to prevent spamming

---

## 📦 Requirements

- Node.js (v18 or later recommended)
- OBS Studio with WebSocket server enabled (OBS WebSocket plugin or OBS 28+)
- Kick account
- `.env` file with auth credentials

---

## 🛠 Installation

1. **Clone this repo (or initialize your existing folder):**

   ```bash
   git init
   git remote add origin https://github.com/yourusername/kick-chat-meme-bot.git
````

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file in the project root with the following content:**

   ```env
   BEARER_TOKEN=your_kick_bearer_token
   COOKIES=your_cookie_string
   OBS_PASSWORD=your_obs_password
   ```

   > ❗ **Do NOT commit this file!** Make sure `.gitignore` includes `.env`.

---

## 🔐 Getting Your Kick `BEARER_TOKEN` and `COOKIES`

1. Go to [https://kick.com](https://kick.com) and log in.
2. Open your browser’s **Developer Tools** (Right-click → Inspect or press `F12`).
3. Navigate to the **Network** tab.
4. Refresh the page.
5. Filter the requests by **XHR** or **Fetch**.
6. Look for a request to something like `/v1/channels` or `/v1/users/me`.
7. Click the request and find the **Headers** tab.
8. Locate:

   * **Authorization** header → copy the token value after `Bearer` → this is your `BEARER_TOKEN`
   * **Cookie** header → copy the entire value → this is your `COOKIES`

Paste both into your `.env` file.

---

## ▶️ Running the Bot

```bash
node index.js
```

---

## ⚙️ Meme Configuration

Meme commands are configured in `index.js` in the `memes` array:

```js
const memes = [
  {
    namespace: "emodmg",
    command: "!emodmg",
    sceneName: "Game Scene",
    sourceName: "emodmg_meme",
    duration: 5000,
    sceneItemId: null, // Will be set at runtime
  },
];
```

* `command`: The chat trigger (e.g. `!emodmg`)
* `sourceName`: OBS source to show/hide
* `sceneName`: OBS scene that contains the source
* `duration`: How long the meme stays visible (in ms)

---

## 🖥 OBS Setup

1. Start OBS.
2. Enable WebSocket server (OBS v28+ includes this natively).
3. Add your meme overlays as sources in the specified scene.
4. Use the WebSocket password in your `.env` under `OBS_PASSWORD`.

---

## 🧊 Cooldown Logic

To prevent spam, each command has a 10-second debounce per user. You can change the debounce time in the code:

```js
const DEBOUNCE_TIME = 10 * 1000; // 10 seconds
```

---

## 📄 License

MIT

---

## 👤 Author

[Jason Lelieveld](https://github.com/jasonclel)
```