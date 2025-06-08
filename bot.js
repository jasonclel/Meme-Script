import { createClient } from "@retconned/kick-js";
import "dotenv/config";
import OBSWebSocket from "obs-websocket-js";

// === OBS Setup ===
const obs = new OBSWebSocket();

// Connect to OBS WebSocket server
try {
  await obs.connect("ws://localhost:4455", process.env.OBS_PASSWORD);
  console.log("Connected to OBS");
} catch (err) {
  console.error("Failed to connect to OBS:", err);
  process.exit(1);
}

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
    command: "!nooo",
    sceneName: SCENE_NAME,
    sourceName: "godno_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "cry",
    command: "!cry",
    sceneName: SCENE_NAME,
    sourceName: "cry_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "boom",
    command: "!boom",
    sceneName: SCENE_NAME,
    sourceName: "explosion_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "gethelp",
    command: "!stopit",
    sceneName: SCENE_NAME,
    sourceName: "gethelp_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "jumpscare",
    command: "!jumpscare",
    sceneName: SCENE_NAME,
    sourceName: "jumpscare_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "kekw",
    command: "!kekw",
    sceneName: SCENE_NAME,
    sourceName: "kekw_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "madbruh",
    command: "!mad",
    sceneName: SCENE_NAME,
    sourceName: "madbruh_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "nice",
    command: "!nice",
    sceneName: SCENE_NAME,
    sourceName: "nice_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "omg",
    command: "!omg",
    sceneName: SCENE_NAME,
    sourceName: "omg_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "scream",
    command: "!scream",
    sceneName: SCENE_NAME,
    sourceName: "scream_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "wow",
    command: "!wow",
    sceneName: SCENE_NAME,
    sourceName: "wow_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "yeaboi",
    command: "!yeaboi",
    sceneName: SCENE_NAME,
    sourceName: "yeaboi_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "uberbjs",
    command: "!uberbjs",
    sceneName: SCENE_NAME,
    sourceName: "uberbjs_meme",
    duration: 10000,
    sceneItemId: null,
  },
  {
    namespace: "bald",
    command: "!bald",
    sceneName: SCENE_NAME,
    sourceName: "bald_meme",
    duration: 10000,
    sceneItemId: null,
  },
];

// Keeps track of the last time each command was triggered to prevent spamming
// === Cooldown + Queue Tracking ===
const lastTriggered = {};
const meme_queue = []; // Changed to array for ordered queue
let lastMemePlayedTime = 0;
const meme_cooldown = 15 * 1000; // 15s
const DEBOUNCE_TIME = 10 * 1000;

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

// === Queue Processor ===
setInterval(async () => {
  const now = Date.now();

  if (meme_queue.length === 0) return;

  // Wait for cooldown before triggering next meme
  if (now - lastMemePlayedTime < meme_cooldown) return;

  const meme = meme_queue.shift();
  console.log(`Dequeued meme: ${meme.namespace}`);

  try {
    await triggerMeme(meme);
    lastMemePlayedTime = Date.now();
  } catch (err) {
    console.error(`Failed to trigger meme '${meme.namespace}':`, err);
  }
}, 1000); // Check every second

// === Chat Listener ===
client.on("ChatMessage", async (message) => {
  const content = message.content.trim().toLowerCase();
  const meme = memes.find(m => m.command === content);
  if (!meme) return;

  const now = Date.now();
  const lastTime = lastTriggered[meme.command] || 0;

  if (now - lastTime < DEBOUNCE_TIME) {
    console.log(`Debounced: '${meme.command}' was used recently.`);
    console.log(`meme timer: '${lastTriggered[meme.command]}'.`);
    console.log(`time result: '${now - lastTime}'`);
    return;
  }
  
  lastTriggered[meme.command] = now;

  // Add meme to queue
  meme_queue.push(meme);
  console.log(`Enqueued meme: ${meme.namespace}`);
});

// Log into Kick chat
await client.login({
  type: "tokens",
  credentials: {
    bearerToken: process.env.BEARER_TOKEN,
    cookies: process.env.COOKIES,
  },
});