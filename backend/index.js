import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("relay-to-antenna", (data) => {
    console.log("🔁 Relaying radar to antenna:", data);
    io.emit("relay-to-antenna", data);
  });

  socket.on("unit-signal", (data) => {
    const { source, type, payload } = data;
    console.log(`${source} sent signal :${type}`, payload);
    io.emit("unit-signal", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Socket.IO server running at http://localhost:3000");
});
