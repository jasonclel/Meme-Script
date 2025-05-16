import { createClient } from "@retconned/kick-js";
import "dotenv/config";
import OBSWebSocket from "obs-websocket-js";

// === OBS Setup ===
const obs = new OBSWebSocket();

// Connect to OBS WebSocket server
await obs.connect("ws://localhost:4455", process.env.OBS_PASSWORD);

const SCENE_NAME = "Game Scene";

// === Meme Table ===
// Each meme entry defines a chat command, the source to toggle in OBS, and how long it should show
const memes = [
  {
    namespace: "emodmg",
    command: "!emodmg",
    sceneName: SCENE_NAME,
    sourceName: "emodmg_meme",
    duration: 5000,
    sceneItemId: null, // Filled in at runtime
  },
  {
    namespace: "godno",
    command: "!godno",
    sceneName: SCENE_NAME,
    sourceName: "godno_meme",
    duration: 10000,
    sceneItemId: null,
  },
];

// Keeps track of the last time each command was triggered to prevent spamming
const lastTriggered = {};
const DEBOUNCE_TIME = 10 * 1000; // 10 seconds in milliseconds

// === Helper Functions ===

// Resolve the OBS scene item ID for a given source within a scene
async function getSceneItemId(sourceName, sceneName) {
  const { sceneItems } = await obs.call("GetSceneItemList", { sceneName });
  const item = sceneItems.find((i) => i.sourceName === sourceName);
  if (!item) throw new Error(`Scene item "${sourceName}" not found`);
  return item.sceneItemId;
}

// Shows the meme source in OBS, then hides it again after the duration
async function triggerMeme(meme) {
  // Resolve and cache the sceneItemId if not already available
  if (!meme.sceneItemId) {
    meme.sceneItemId = await getSceneItemId(meme.sourceName, meme.sceneName);
  }

  // Show the OBS source
  await obs.call("SetSceneItemEnabled", {
    sceneName: meme.sceneName,
    sceneItemId: meme.sceneItemId,
    sceneItemEnabled: true,
  });

  // Hide it again after the configured duration
  setTimeout(async () => {
    try {
      await obs.call("SetSceneItemEnabled", {
        sceneName: meme.sceneName,
        sceneItemId: meme.sceneItemId,
        sceneItemEnabled: false,
      });
      console.log(`OBS source '${meme.sourceName}' hidden again.`);
    } catch (err) {
      console.error(`Error hiding source '${meme.sourceName}':`, err);
    }
  }, meme.duration);
}

// === Kick Client Setup ===
const client = createClient(process.env.CHANNEL_NAME, { logger: true, readOnly: true });

client.on("ready", () => {
  console.log(`Bot is ready and connected as ${client.user?.tag}`);
});

// Listen for chat messages and trigger memes based on commands
client.on("ChatMessage", async (message) => {
  const content = message.content.trim().toLowerCase();

  const meme = memes.find(m => m.command === content);
  if (!meme) return; // Ignore messages that aren't meme commands

  const now = Date.now();
  const lastTime = lastTriggered[meme.command] || 0;

  // Debounce to avoid spam
  if (now - lastTime > DEBOUNCE_TIME) {
    lastTriggered[meme.command] = now;
    console.log(`Triggering meme '${meme.namespace}' for command '${meme.command}'`);
    try {
      await triggerMeme(meme);
    } catch (err) {
      console.error(`Failed to trigger meme '${meme.namespace}':`, err);
    }
  } else {
    console.log(`Command '${meme.command}' is on cooldown.`);
  }
});

// Log into Kick chat
client.login({
  type: "tokens",
  credentials: {
    bearerToken: process.env.BEARER_TOKEN,
    cookies: process.env.COOKIES,
  },
});