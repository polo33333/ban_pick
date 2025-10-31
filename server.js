import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { initializeSocketHandlers } from "./server/socketHandlers.js";
import compression from "compression"; // <-- thêm dòng này

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Phục vụ các tệp tĩnh từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Phục vụ thư mục icon và background
// Cấu hình để phục vụ các tệp tĩnh từ thư mục 'assets'
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/icon', express.static(path.join(process.cwd(), 'icon')));
app.use('/background', express.static(path.join(process.cwd(), 'background')));

// ---- Khi client kết nối ----
io.on("connection", socket => {
  console.log("Socket connected:", socket.id);
  initializeSocketHandlers(io, socket);
});

// ---- Serve UI test ----
app.get("/characters", async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'character_local.json'), 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (error) {
    console.error("Failed to load character_local.json:", error);
    res.status(500).send("Error loading character data");
  }
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client.html"));
});

server.listen(PORT, () =>
  console.log(`Draft server running on http://localhost:${PORT}`)
);
