// components/CentralAI.jsx
import React, { useState } from "react";
import { Rect, Text, Group, Label, Tag } from "react-konva";

export default function CentralAI({ x, y , floatingMessages = []}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Group
      x={x}
      y={y}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Central AI Box - moved down by 20px */}
      <Rect
        y={20}
        width={100}
        height={60}
        fill="#2a2a72"
        cornerRadius={10}
        shadowBlur={10}
        shadowColor="cyan"
      />
      <Text
        text="Central AI"
        fontSize={16}
        fill="#fff"
        padding={10}
        width={100}
        align="center"
        y={38} // 20 (offset of box) + 18 (original text offset)
      />

      {/* Tooltip on Hover */}
      {showTooltip && (
        <Label x={110} y={0}>
          <Tag fill="black" opacity={0.85} />
          <Text
            text={
              "Evaluates threats\nAssigns interception or jamming\nPrioritizes closest/dangerous missiles"
            }
            fill="white"
            fontSize={14}
            padding={6}
            lineHeight={1.3}
          />
        </Label>
      )}
       {floatingMessages.map((msg) => (
        <FloatingMessage key={msg.id} {...msg} />
      ))}
    </Group>
  );
}
