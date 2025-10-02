import React from "react";
import { Label, Tag, Text } from "react-konva";

export default function Tooltip({ x, y, text, visible }) {
  if (!visible) return null;

  return (
    <Label x={x + 12} y={y + 12}>
      <Tag
        fill="rgba(0,0,0,0.7)"
        cornerRadius={8}
        pointerDirection="down"
        pointerWidth={10}
        pointerHeight={10}
      />
      <Text
        text={text}
        fontSize={14}
        fill="white"
        padding={8}
        lineHeight={1.2}
      />
    </Label>
  );
}
