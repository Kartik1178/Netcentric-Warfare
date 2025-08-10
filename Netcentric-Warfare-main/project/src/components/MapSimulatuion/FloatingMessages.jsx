import React from "react";
import { Group } from "react-konva";
import FloatingMessage from "./FloatingMessage";

export default function FloatingMessages({ messages }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <>
      {messages.map((msg) => (
        <Group key={msg.id} x={msg.x} y={msg.y}>
          <FloatingMessage
            x={0} // Render FloatingMessage at (0,0) relative to its parent Group.
            y={0}
            text={msg.text}
            duration={msg.duration || 2}
            color={msg.color}
          />
        </Group>
      ))}
    </>
  );
}