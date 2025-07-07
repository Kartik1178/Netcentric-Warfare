import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectToMongo, getDb } from "./db.js";
import missileRoutes from "./routes/Missiles.js"
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
await connectToMongo();
const db = getDb();
const logsCollection = db.collection("logs");
app.use(missileRoutes);
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("relay-to-antenna", (data) => {
    console.log("🔁 Relaying radar to antenna:", data);
    io.emit("relay-to-antenna", data);
  });
  socket.on("frequency-change", (data) => {
    console.log(`📡 Server received frequency change from ${data.unitId}: ${data.newFrequency}`);
   io.emit("frequency-change", data);
    socket.emit("frequency-change-ack", { status: "received" });
  });
  socket.on("unit-signal", (data) => {
    const { source, type, payload } = data;
    console.log(`${source} sent signal :${type}`, payload);
    io.emit("unit-signal", data);
  });
socket.on("jammer-broadcast", (data) => {
    console.log(" Jammer broadcast:", data);
    io.emit("jammer-broadcast", data);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Socket.IO server running at http://localhost:3000");
});
