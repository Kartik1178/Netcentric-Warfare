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

// 2️⃣ MongoDB connection using mongoose
await connectToMongo();  // Mongoose handles models internally — no getDb() needed!

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

  socket.on("jammer-broadcast", (data) => {
    console.log("📡 Jammer broadcast:", data);
    io.emit("jammer-broadcast", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// 5️⃣ Start server
server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
