import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { initializeSocketHandlers } from "./server/socketHandlers.js";
import { getStats } from "./server/statsManager.js";
import compression from "compression"; // <-- thêm dòng này

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 2. Serve large static files (images) BEFORE compression to avoid conflicts/overhead
// This ensures that images are served directly by express.static without any compression logic touching them.
app.use('/assets', express.static(path.join(__dirname, 'client', 'assets')));
// Legacy paths for backward compatibility (redirect to new paths)
app.use('/icon', express.static(path.join(__dirname, 'client', 'assets', 'icons')));
app.use('/background', express.static(path.join(__dirname, 'client', 'assets', 'backgrounds')));
app.use('/element', express.static(path.join(__dirname, 'client', 'assets', 'elements')));
app.use('/live2d', express.static(path.join(__dirname, 'client', 'assets', 'live2d')));

// 3. Compression middleware (now only affects things below it)
// 🛠️ Chỉ nén JSON/HTML, không nén ảnh
app.use(
  compression({
    filter: (req, res) => {
      const type = res.getHeader("Content-Type") || "";
      if (req.url.match(/\.(webp|png|jpg|jpeg|gif)$/i)) return false;
      return compression.filter(req, res);
    },
  })
);

// 4. Serve the rest of public (CSS, JS, HTML) - these WILL be compressed
app.use(express.static(path.join(__dirname, 'client')));

// ---- Khi client kết nối ----
io.on("connection", socket => {
  console.log("Socket connected:", socket.id);
  initializeSocketHandlers(io, socket);
});

// ---- Serve UI test ----
app.get("/api/characters", async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'character_local.json'), 'utf-8');
    const characters = JSON.parse(data);

    // Filter characters where isActive is true
    const activeCharacters = {};
    for (const [id, char] of Object.entries(characters)) {
      if (char.isActive) {
        activeCharacters[id] = char;
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(activeCharacters);
  } catch (error) {
    console.error("Failed to load character_local.json:", error);
    res.status(500).send("Error loading character data");
  }
});

// ---- Serve statistics API ----
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await getStats();
    res.setHeader('Content-Type', 'application/json');
    res.json(stats);
  } catch (error) {
    console.error("Failed to load statistics:", error);
    res.status(500).send("Error loading statistics");
  }
});

// ---- Serve UI test ----
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'views', 'client.html'));
});

app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'views', 'stats.html'));
});

server.listen(PORT, () =>
  console.log(`Draft server running on http://localhost:${PORT}`)
);
