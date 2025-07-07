import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectToMongo, getDb } from "./db.js";
import missileRoutes from "./routes/Missiles.js";

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
  console.log("✅ New client connected:", socket.id);

  // 1. Relay radar to antenna
  socket.on("relay-to-antenna", (data) => {
    console.log("🔁 Relaying radar to antenna:", data);
    io.emit("relay-to-antenna", data);
  });

  // 2. Unit signals
  socket.on("unit-signal", (data) => {
    const { source, type, payload } = data;
    console.log(`${source} sent signal : ${type}`, payload);
    io.emit("unit-signal", data);
  });

  // 3. Jammer broadcasts
  socket.on("jammer-broadcast", (data) => {
    console.log("📡 Jammer broadcast:", data);
    io.emit("jammer-broadcast", data);
  });

  // ✅ 4. START THREAT SIMULATION — FIXED: placed inside io.on()
  socket.on("start-threat-simulation", (params) => {
    const id = `missile-${Date.now()}`;
    const { speed, altitude, distance, direction, threatType } = params;

    const startX = 500 + distance * Math.cos(direction * (Math.PI / 180));
    const startY = 400 + distance * Math.sin(direction * (Math.PI / 180));

    const missile = {
      id,
      type: "missile",
      x: startX,
      y: startY,
      speed,
      altitude,
      direction,
      threatType,
    };

    io.emit("simulation-log", {
      timestamp: new Date().toLocaleTimeString(),
      type: "detection",
      source: "Radar Unit",
      payload: missile,
    });

    let ticks = 0;
    const interval = setInterval(() => {
      ticks++;

      // Simulate movement
      missile.x -= 10 * Math.cos(direction * (Math.PI / 180));
      missile.y -= 10 * Math.sin(direction * (Math.PI / 180));

      io.emit("missile-update", missile);

      // At tick 10, launch interceptor
      if (ticks === 10) {
        const interceptor = {
          id: `interceptor-${Date.now()}`,
          type: "interceptor",
          x: 500,
          y: 400,
        };

        io.emit("interceptor-update", interceptor);

        io.emit("simulation-log", {
          timestamp: new Date().toLocaleTimeString(),
          type: "response",
          source: "Launcher Unit",
          payload: interceptor,
        });
      }

      // At tick 20, end simulation
      if (ticks >= 20) {
        clearInterval(interval);

        io.emit("remove-object", missile.id);
        io.emit("remove-object", `interceptor-${Date.now()}`);

        io.emit("simulation-log", {
          timestamp: new Date().toLocaleTimeString(),
          type: "intercept",
          source: "System",
          payload: { result: "Threat Neutralized" },
        });
      }
    }, 1000);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("🚀 Socket.IO server running at http://localhost:3000");
});
