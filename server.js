import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const MEMES_FILE = path.join(__dirname, 'memes.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from any location via file path
app.get('/file/*', (req, res) => {
  let requestedPath = req.params[0];
  
  try {
    // Extract and decode the file path from the URL (everything after /file/)
    // Handle multiple levels of URL encoding that might occur
    
    // Decode the URL-encoded path (handles spaces and special characters)
    try {
      requestedPath = decodeURIComponent(requestedPath);
    } catch (decodeError) {
      console.error('Failed to decode URL path:', requestedPath, decodeError.message);
      return res.status(400).json({ error: 'Invalid URL encoding in file path' });
    }
    
    let filePath;
    
    console.log('Raw requested path:', req.params[0]);
    console.log('Decoded requested path:', requestedPath);
    
    // If it looks like an absolute path, use it directly
    if (path.isAbsolute(requestedPath)) {
      filePath = requestedPath;
    } else {
      // If relative, assume it's relative to the memes folder
      filePath = path.join(__dirname, 'public', 'memes', requestedPath);
    }
    
    console.log('Resolved file path:', filePath);
    
    // Additional security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath !== filePath) {
      console.warn('Path normalization changed path:', filePath, '->', normalizedPath);
      filePath = normalizedPath;
    }
    
    // Security check - ensure the file exists and is readable
    fs.access(filePath)
      .then(() => {
        console.log('File found, serving:', filePath);
        // Set appropriate content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.mov': 'video/quicktime',
          '.avi': 'video/x-msvideo',
          '.mkv': 'video/x-matroska',
          '.gif': 'image/gif',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.ogg': 'audio/ogg',
          '.aac': 'audio/aac'
        };
        
        if (contentTypes[ext]) {
          res.setHeader('Content-Type', contentTypes[ext]);
        }
        
        // Send the file
        res.sendFile(filePath);
      })
      .catch((error) => {
        console.error('=== FILE ACCESS ERROR ===');
        console.error('Requested file path:', filePath);
        console.error('File exists check failed');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('========================');
        
        res.status(404).json({ 
          error: `File not found: ${filePath}`,
          details: error.message,
          code: error.code,
          originalPath: req.params[0],
          decodedPath: requestedPath
        });
      });
  } catch (error) {
    console.error('Error processing file request:', error.message);
    res.status(400).json({ error: 'Invalid file path' });
  }
});

// Default memes structure (updated for file-based system)
const defaultMemes = [
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

// Initialize memes file if it doesn't exist
async function initMemesFile() {
  try {
    await fs.access(MEMES_FILE);
  } catch {
    await fs.writeFile(MEMES_FILE, JSON.stringify(defaultMemes, null, 2));
    console.log('Created memes.json with default memes');
  }
}

// Load memes from file
async function loadMemes() {
  try {
    const data = await fs.readFile(MEMES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading memes:', error);
    return defaultMemes;
  }
}

// Save memes to file
async function saveMemes(memes) {
  try {
    await fs.writeFile(MEMES_FILE, JSON.stringify(memes, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving memes:', error);
    return false;
  }
}

// API Routes

// Get all memes
app.get('/api/memes', async (req, res) => {
  const memes = await loadMemes();
  res.json(memes);
});

// Get single meme
app.get('/api/memes/:namespace', async (req, res) => {
  const memes = await loadMemes();
  const meme = memes.find(m => m.namespace === req.params.namespace);
  if (!meme) {
    return res.status(404).json({ error: 'Meme not found' });
  }
  res.json(meme);
});

// Create new meme
app.post('/api/memes', async (req, res) => {
  const { namespace, command, filePath, duration } = req.body;
  
  if (!namespace || !command || !filePath || !duration) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const memes = await loadMemes();
  
  // Check if namespace or command already exists
  if (memes.find(m => m.namespace === namespace)) {
    return res.status(400).json({ error: 'Namespace already exists' });
  }
  if (memes.find(m => m.command === command)) {
    return res.status(400).json({ error: 'Command already exists' });
  }

  const newMeme = {
    namespace,
    command,
    filePath,
    duration: parseInt(duration)
  };

  memes.push(newMeme);
  
  if (await saveMemes(memes)) {
    notifyMemesUpdated();
    res.status(201).json(newMeme);
  } else {
    res.status(500).json({ error: 'Failed to save meme' });
  }
});

// Update meme
app.put('/api/memes/:namespace', async (req, res) => {
  const { command, filePath, duration } = req.body;
  const memes = await loadMemes();
  
  const memeIndex = memes.findIndex(m => m.namespace === req.params.namespace);
  if (memeIndex === -1) {
    return res.status(404).json({ error: 'Meme not found' });
  }

  // Check if command conflicts with other memes
  const commandConflict = memes.find(m => m.command === command && m.namespace !== req.params.namespace);
  if (commandConflict) {
    return res.status(400).json({ error: 'Command already exists' });
  }

  memes[memeIndex] = {
    ...memes[memeIndex],
    command,
    filePath,
    duration: parseInt(duration)
  };

  if (await saveMemes(memes)) {
    notifyMemesUpdated();
    res.json(memes[memeIndex]);
  } else {
    res.status(500).json({ error: 'Failed to save meme' });
  }
});

// Delete meme
app.delete('/api/memes/:namespace', async (req, res) => {
  const memes = await loadMemes();
  const memeIndex = memes.findIndex(m => m.namespace === req.params.namespace);
  
  if (memeIndex === -1) {
    return res.status(404).json({ error: 'Meme not found' });
  }

  memes.splice(memeIndex, 1);
  
  if (await saveMemes(memes)) {
    notifyMemesUpdated();
    res.status(204).send();
  } else {
    res.status(500).json({ error: 'Failed to delete meme' });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the meme overlay page
app.get('/overlays/memes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'meme-overlay.html'));
});

// Stream manager API endpoints
app.get('/api/stream-manager/status', (req, res) => {
  const running = streamManagerProcess && !streamManagerProcess.killed;
  res.json({ 
    running,
    pid: running ? streamManagerProcess.pid : null 
  });
});

app.post('/api/stream-manager/toggle', (req, res) => {
  try {
    if (streamManagerProcess && !streamManagerProcess.killed) {
      // Stop the stream manager
      streamManagerProcess.kill('SIGTERM');
      streamManagerProcess = null;
      console.log('Stream manager stopped');
      res.json({ running: false });
    } else {
      // Start the stream manager
      streamManagerProcess = spawn('node', ['stream-manager.js'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      streamManagerProcess.stdout.on('data', (data) => {
        console.log(`[Stream Manager] ${data.toString().trim()}`);
      });

      streamManagerProcess.stderr.on('data', (data) => {
        console.error(`[Stream Manager Error] ${data.toString().trim()}`);
      });

      streamManagerProcess.on('close', (code) => {
        console.log(`Stream manager exited with code ${code}`);
        streamManagerProcess = null;
      });

      streamManagerProcess.on('error', (error) => {
        console.error('Failed to start stream manager:', error);
        streamManagerProcess = null;
      });

      console.log('Stream manager started with PID:', streamManagerProcess.pid);
      res.json({ running: true, pid: streamManagerProcess.pid });
    }
  } catch (error) {
    console.error('Error toggling stream manager:', error);
    res.status(500).json({ error: 'Failed to toggle stream manager' });
  }
});

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients
const clients = new Set();

// Stream manager process tracking
let streamManagerProcess = null;

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection from:', req.socket.remoteAddress);
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to meme overlay server' 
  }));

  // Handle client messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received WebSocket message:', message);
      
      if (message.type === 'pong') {
        console.log('Received pong from client');
      } else if (message.type === 'trigger_meme') {
        // Forward meme trigger from stream manager to overlays
        triggerMeme(message.meme);
      } else if (message.type === 'connection_status') {
        // Forward connection status from stream manager to web interface
        broadcastConnectionStatus(
          message.status, 
          message.details, 
          message.reconnectAttempts, 
          message.nextRetryIn
        );
      } else if (message.type === 'queue_update') {
        // Forward queue update from stream manager to clients
        broadcastQueueUpdate(message.queueSize);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Function to broadcast meme trigger to all connected clients
export function triggerMeme(meme) {
  const message = JSON.stringify({
    type: 'trigger_meme',
    meme: meme
  });

  let activeClients = 0;
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
      activeClients++;
    } else {
      clients.delete(client);
    }
  });

  console.log(`Triggered meme "${meme.namespace}" to ${activeClients} connected overlay(s)`);
  return activeClients;
}

// Function to broadcast queue updates
export function broadcastQueueUpdate(queueSize) {
  const message = JSON.stringify({
    type: 'queue_update',
    queueSize: queueSize
  });

  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    } else {
      clients.delete(client);
    }
  });
}

// Function to broadcast connection status updates
export function broadcastConnectionStatus(status, details = null, reconnectAttempts = 0, nextRetryIn = null) {
  const message = JSON.stringify({
    type: 'connection_status',
    status,
    details,
    reconnectAttempts,
    nextRetryIn,
    timestamp: Date.now()
  });

  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    } else {
      clients.delete(client);
    }
  });
  
  console.log(`Broadcasting connection status: ${status}${details ? ` - ${details}` : ''}`);
}

// Function to notify stream manager of meme configuration updates
function notifyMemesUpdated() {
  const message = JSON.stringify({
    type: 'memes_updated',
    timestamp: Date.now()
  });

  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    } else {
      clients.delete(client);
    }
  });
  
  console.log('📝 Notified clients that memes configuration was updated');
}

// Periodic ping to keep connections alive
setInterval(() => {
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'ping' }));
    } else {
      clients.delete(client);
    }
  });
}, 30000); // Ping every 30 seconds

// Initialize and start server
await initMemesFile();
server.listen(PORT, () => {
  console.log(`🎭 Kick Meme Bot Server running at http://localhost:${PORT}`);
  console.log(`📋 Configuration Interface: http://localhost:${PORT}`);
  console.log(`🎬 Meme Overlay (OBS): http://localhost:${PORT}/overlays/memes`);
  console.log(`⚡ Use the web interface to start/stop the stream manager`);
});