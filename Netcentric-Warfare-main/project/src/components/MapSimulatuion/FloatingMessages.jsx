import React from "react";
import { Group,Circle } from "react-konva";
import FloatingMessage from "./FloatingMessage";

export default function FloatingMessages({ messages }) {


  if (!messages || messages.length === 0) {
   
    return null;
  }

  return (
    <>
      {messages.map((msg) => {
        const validX = typeof msg.x === "number" && isFinite(msg.x);
        const validY = typeof msg.y === "number" && isFinite(msg.y);
        if (!validX || !validY) console.warn(`Invalid coordinates for message id=${msg.id}`, msg);

        console.log(`Rendering message id=${msg.id} at (${msg.x}, ${msg.y}):`, msg.text);

        return (
         <Group key={msg.id} x={msg.x} y={msg.y}>
  {/* Debug circle to check position */}
  <Circle x={0} y={0} radius={5} fill="yellow" />
  <FloatingMessage text={msg.text} duration={msg.duration || 2} color={msg.color} />
</Group>

        );
      })}
    </>
  );
}
