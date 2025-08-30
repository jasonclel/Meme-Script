import { createClient } from "@retconned/kick-js";
import "dotenv/config";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMES_FILE = path.join(__dirname, 'memes.json');

// === Meme Configuration ===
// Load memes from configuration file
async function loadMemes() {
  try {
    const data = await fs.readFile(MEMES_FILE, 'utf8');
    const memes = JSON.parse(data);
    return memes;
  } catch (error) {
    console.error('Error loading memes:', error);
    // Fallback to default memes if file doesn't exist
    return [
      {
        namespace: "emodmg",
        command: "!emodmg",
        filePath: "emodmg.gif",
        duration: 5000
      },
      {
        namespace: "godno",
        command: "!nooo",
        filePath: "godno.gif", 
        duration: 10000
      }
    ];
  }
}

let memes = await loadMemes();
console.log(`Loaded ${memes.length} memes from configuration`);

// Function to reload memes configuration
async function reloadMemes() {
  try {
    const newMemes = await loadMemes();
    memes = newMemes;
    console.log(`🔄 Reloaded ${memes.length} memes from configuration`);
  } catch (error) {
    console.error('❌ Failed to reload memes:', error);
  }
}

// === WebSocket Client Connection ===
let serverWs = null;
let wsReconnectAttempts = 0;
const maxWsReconnectAttempts = 5;
let wsReconnectTimer = null;

function connectToServer() {
  if (isShuttingDown) return;
  
  try {
    serverWs = new WebSocket('ws://localhost:3000/ws');
    
    serverWs.on('open', () => {
      console.log('📡 Connected to configuration server');
      wsReconnectAttempts = 0;
    });
    
    serverWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'memes_updated') {
          console.log('📝 Memes configuration updated, reloading...');
          reloadMemes();
        }
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    });
    
    serverWs.on('close', () => {
      console.log('📡 Disconnected from configuration server');
      if (!isShuttingDown && wsReconnectAttempts < maxWsReconnectAttempts) {
        scheduleWsReconnect();
      }
    });
    
    serverWs.on('error', (error) => {
      console.error('WebSocket connection error:', error.message);
      if (!isShuttingDown && wsReconnectAttempts < maxWsReconnectAttempts) {
        scheduleWsReconnect();
      }
    });
  } catch (error) {
    console.error('Failed to connect to server:', error.message);
    if (!isShuttingDown && wsReconnectAttempts < maxWsReconnectAttempts) {
      scheduleWsReconnect();
    }
  }
}

function scheduleWsReconnect() {
  if (isShuttingDown || wsReconnectAttempts >= maxWsReconnectAttempts) return;
  
  wsReconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
  
  console.log(`Scheduling server reconnect in ${delay}ms (attempt ${wsReconnectAttempts}/${maxWsReconnectAttempts})`);
  
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    connectToServer();
  }, delay);
}

function sendToServer(data) {
  if (serverWs && serverWs.readyState === WebSocket.OPEN) {
    serverWs.send(JSON.stringify(data));
  }
}

// Keeps track of the last time each command was triggered to prevent spamming
// === Cooldown + Queue Tracking ===
const lastTriggered = {};
const meme_queue = []; // Changed to array for ordered queue
let lastMemePlayedTime = 0;
const meme_cooldown = 15 * 1000; // 15s
const DEBOUNCE_TIME = 10 * 1000;

// === Helper Functions ===

// Trigger meme via WebSocket to browser source
function triggerMemeOverlay(meme) {
  sendToServer({
    type: 'trigger_meme',
    meme: meme
  });
  return 1; // Assume one overlay for logging purposes
}

// === Connection Management ===
let client = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
let reconnectDelay = 1000; // Start with 1 second
const maxReconnectDelay = 300000; // Max 5 minutes
let reconnectTimer = null;
let isShuttingDown = false;

// Connection status tracking
let connectionStatus = 'disconnected';
let lastConnectionTime = null;
let connectionAttemptTime = null;

function updateConnectionStatus(status, details = null) {
  connectionStatus = status;
  const nextRetryIn = reconnectTimer ? Math.ceil(reconnectDelay / 1000) : null;
  
  sendToServer({
    type: 'connection_status',
    status,
    details,
    reconnectAttempts,
    nextRetryIn,
    timestamp: Date.now()
  });
}

async function createKickClient() {
  if (client) {
    try {
      await client.disconnect();
    } catch (error) {
      console.log('Error disconnecting existing client:', error.message);
    }
    client = null;
  }

  connectionAttemptTime = Date.now();
  updateConnectionStatus('connecting', `Attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
  
  client = createClient(process.env.CHANNEL_NAME, { 
    logger: true, 
    readOnly: true
  });

  return setupClientHandlers();
}

function setupClientHandlers() {
  return new Promise((resolve, reject) => {
    const connectTimeout = setTimeout(() => {
      reject(new Error('Connection timeout after 30 seconds'));
    }, 30000);

    client.on("ready", () => {
      clearTimeout(connectTimeout);
      reconnectAttempts = 0;
      reconnectDelay = 1000;
      lastConnectionTime = Date.now();
      updateConnectionStatus('connected', `Connected as ${client.user?.tag}`);
      console.log(`🎉 Stream manager connected to Kick chat as ${client.user?.tag}`);
      resolve();
    });

    client.on("error", (error) => {
      clearTimeout(connectTimeout);
      console.error('Kick client error:', error);
      updateConnectionStatus('error', error.message);
      
      if (!isShuttingDown) {
        scheduleReconnect(error);
      }
      reject(error);
    });

    client.on("disconnect", (reason) => {
      console.log('Disconnected from Kick:', reason);
      updateConnectionStatus('disconnected', reason);
      
      if (!isShuttingDown) {
        scheduleReconnect(new Error(`Disconnected: ${reason}`));
      }
    });

    // Add connection monitoring
    const monitorInterval = setInterval(() => {
      if (isShuttingDown) {
        clearInterval(monitorInterval);
        return;
      }

      // Check if we've been connected for a while but haven't received any activity
      const now = Date.now();
      if (lastConnectionTime && (now - lastConnectionTime > 300000)) { // 5 minutes
        console.log('Connection appears stale, forcing reconnect...');
        clearInterval(monitorInterval);
        scheduleReconnect(new Error('Connection appears stale'));
      }
    }, 60000); // Check every minute

    // Chat message handler
    client.on("ChatMessage", async (message) => {
      lastConnectionTime = Date.now(); // Update activity timestamp
      
      const content = message.content.trim().toLowerCase();
      const meme = memes.find(m => m.command === content);
      if (!meme) return;

      const now = Date.now();
      const lastTime = lastTriggered[meme.command] || 0;

      if (now - lastTime < DEBOUNCE_TIME) {
        console.log(`Debounced: '${meme.command}' was used recently.`);
        return;
      }
      
      lastTriggered[meme.command] = now;

      // Add meme to queue
      meme_queue.push(meme);
      console.log(`Enqueued meme: ${meme.namespace}`);
      
      // Broadcast queue size update
      sendToServer({
        type: 'queue_update',
        queueSize: meme_queue.length
      });
    });
  });
}

function scheduleReconnect(error) {
  if (isShuttingDown || reconnectAttempts >= maxReconnectAttempts) {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Manual restart required.');
      updateConnectionStatus('failed', 'Max reconnection attempts reached');
    }
    return;
  }

  reconnectAttempts++;
  console.log(`Scheduling reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${reconnectDelay}ms`);
  updateConnectionStatus('reconnecting', `Retry ${reconnectAttempts}/${maxReconnectAttempts} in ${Math.ceil(reconnectDelay / 1000)}s`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    
    try {
      await createKickClient();
      await loginToKick();
    } catch (error) {
      console.error(`Reconnect attempt ${reconnectAttempts} failed:`, error.message);
      
      // Exponential backoff with jitter
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      const jitter = Math.random() * 1000;
      reconnectDelay += jitter;
      
      scheduleReconnect(error);
    }
  }, reconnectDelay);
}

async function loginToKick() {
  await client.login({
    type: "tokens",
    credentials: {
      bearerToken: process.env.BEARER_TOKEN,
      cookies: process.env.COOKIES,
    },
  });
}

// === Initial Connection ===
async function initializeConnection() {
  try {
    await createKickClient();
    await loginToKick();
  } catch (error) {
    console.error('Initial connection failed:', error.message);
    if (!isShuttingDown) {
      scheduleReconnect(error);
    }
  }
}

// === Queue Processor ===
setInterval(async () => {
  const now = Date.now();

  if (meme_queue.length === 0) return;

  // Wait for cooldown before triggering next meme
  if (now - lastMemePlayedTime < meme_cooldown) return;

  const meme = meme_queue.shift();
  console.log(`Dequeued meme: ${meme.namespace}`);

  try {
    // Send meme trigger to server (which will forward to overlays)
    triggerMemeOverlay(meme);
    console.log(`Sent meme "${meme.namespace}" to server for overlay trigger`);
    lastMemePlayedTime = Date.now();
    
    // Broadcast queue size update
    sendToServer({
      type: 'queue_update',
      queueSize: meme_queue.length
    });
  } catch (err) {
    console.error(`Failed to trigger meme '${meme.namespace}':`, err);
  }
}, 1000); // Check every second

// === Graceful Shutdown ===
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  isShuttingDown = true;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  
  if (client) {
    client.disconnect().catch(console.error);
  }
  
  if (serverWs) {
    serverWs.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  isShuttingDown = true;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  
  if (client) {
    client.disconnect().catch(console.error);
  }
  
  if (serverWs) {
    serverWs.close();
  }
  
  process.exit(0);
});

// === Initialize Connections ===
console.log('🚀 Starting Kick Stream Manager...');
connectToServer();
initializeConnection();