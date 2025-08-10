// server.js or index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectToMongo } from "./db.js";
import missileRoutes from "./routes/Missiles.js";
import jammerRouters from "./routes/Jammers.js"
// 1️⃣ Setup express & Socket.IO
const app = express();
app.use(cors());
app.use(express.json());

await connectToMongo();  

// 3️⃣ API routes
app.use(missileRoutes);
app.use(jammerRouters);
// 4️⃣ Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  socket.on("relay-to-antenna", (data) => {
    console.log("🔁 Relaying radar to antenna:", data);
    io.emit("relay-to-antenna", data);
  });

  socket.on("frequency-change", (data) => {
    console.log(`📡 Frequency change from ${data.unitId}: ${data.newFrequency}`);
    io.emit("frequency-change", data);
    socket.emit("frequency-change-ack", { status: "received" });
  });

  socket.on("unit-signal", (data) => {
    console.log(`📡 ${data.source} sent signal: ${data.type}`, data.payload);
    io.emit("unit-signal", data);
  });
socket.on("relay-to-c2", (missileData) => {
  console.log(`[Backend] Received relay-to-c2 from Antenna`, missileData);
  io.emit("relay-to-c2", missileData);
});

  socket.on("jammer-broadcast", (data) => {
    console.log("📡 Jammer broadcast:", data);
    io.emit("jammer-broadcast", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
socket.on("command-launch", ({ missile, launcherId }) => {
  console.log(`🚀  AI command: Launch interceptor from ${launcherId} for missile ${missile.id}`);
  io.emit("launch-interceptor", { missile, launcherId });
});

socket.on("command-jam", ({ missile, jammerId }) => {
  console.log(`🛰️ Central AI command: Activate jammer ${jammerId} for missile ${missile.id}`);
  io.emit("activate-jammer", { missile, jammerId });
});



});

// 5️⃣ Start server
server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
