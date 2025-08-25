import { useEffect, useState } from "react";
import { useCentralAI } from "../hooks/useCentralAI";
import { useUnits } from "../hooks/useUnits"; // your existing hook managing bases/subbases
import { emitFloatingSignal } from "../hooks/FloatingSignal"; // your existing floating signal emitter
import socket from "../components/socket";

export default function DemoScenario() {
  const [units, setUnits] = useUnits(); // current bases/sub-bases
  const [missiles, setMissiles] = useState([]);
  const [jammers, setJammers] = useState([]);

  // Initialize CentralAI
  useCentralAI(units, null, emitSignal, showMessage);

  // Demo messages for floating signals
  function showMessage(x, y, text, duration = 2, type = "central-ai") {
    emitFloatingSignal({ x, y, text, duration, type });
  }

  // Emit signal wrapper
  function emitSignal(signal) {
    socket.emit("unit-signal", signal);
  }

  useEffect(() => {
    // Demo scenario timeline
    const timeline = [
      { time: 1000, type: "missile", x: 100, y: 50, targetSubBase: "base1-sub1" },
      { time: 5000, type: "missile", x: 200, y: 120, targetSubBase: "base1-sub2" },
      { time: 8000, type: "drone", x: 150, y: 200, targetSubBase: "base2-sub1" },
      { time: 12000, type: "artillery", x: 400, y: 300, targetSubBase: "base3-sub1" },
      { time: 15000, type: "missile-failover", x: 220, y: 140, targetSubBase: "base1-sub3" },
      { time: 20000, type: "jammer-activate", x: 250, y: 180, targetSubBase: "base2-sub2" },
      { time: 25000, type: "missile", x: 300, y: 50, targetSubBase: "base3-sub2" },
      { time: 30000, type: "missile-failover", x: 310, y: 60, targetSubBase: "base3-sub3" },
    ];

    timeline.forEach((event) => {
      setTimeout(() => {
        if (event.type === "missile" || event.type === "missile-failover") {
          const missile = {
            id: `demo-${Date.now()}`,
            name: "Missile",
            x: event.x,
            y: event.y,
            vx: 0.05,
            vy: 0.05,
            type: "missile",
            targetSubBase: event.targetSubBase,
          };
          setMissiles((prev) => [...prev, missile]);
          socket.emit("unit-signal", { type: "relay-to-c2", source: "antenna", payload: missile });
        } else if (event.type === "drone") {
          const drone = { id: `demo-drone-${Date.now()}`, x: event.x, y: event.y, type: "drone", targetSubBase: event.targetSubBase };
          setMissiles((prev) => [...prev, drone]);
          socket.emit("unit-signal", { type: "relay-to-c2", source: "antenna", payload: drone });
        } else if (event.type === "artillery") {
          const artillery = { id: `demo-artillery-${Date.now()}`, x: event.x, y: event.y, type: "artillery", targetSubBase: event.targetSubBase };
          setMissiles((prev) => [...prev, artillery]);
          socket.emit("unit-signal", { type: "relay-to-c2", source: "antenna", payload: artillery });
        } else if (event.type === "jammer-activate") {
          const jammer = { id: `demo-jammer-${Date.now()}`, x: event.x, y: event.y, type: "jammer", targetSubBase: event.targetSubBase };
          setJammers((prev) => [...prev, jammer]);
          socket.emit("unit-signal", { type: "relay-to-c2", source: "antenna", payload: jammer });
        }
      }, event.time);
    });
  }, []);

  return null; // no UI needed, just simulation signals
}
