import React, { useEffect, useState } from 'react'
import { Group,Circle,Image } from 'react-konva';
import useImage from 'use-image';
export const Interceptor = ({targetX,radius=10,targetY,x,y,speed=2}) => {
   const [image] = useImage("/missile.png");
  const [position,setPosition]=useState({x,y})
  useEffect(()=>{
const interval=setInterval(()=>{
const dx=targetX-position.x;
const dy = targetY - position.y;
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance<5){
  clearInterval(interval);
   console.log(" Interceptor reached target!");
   return;
}
setPosition((pos)=>({
x: pos.x + (dx / distance) * speed,
y: pos.y + (dy / distance) * speed
}));
},16);
 return () => clearInterval(interval);
}, [position, targetX, targetY, speed]);


  
  
    return (
 <Group x={position.x} y={position.y}>
   
      <Circle
        radius={radius}
        fill="green" 
        shadowBlur={4}
        shadowColor="black"
      />
      {image && (
        <Image
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
            ctx.closePath();
          }}
        />
      )}
    </Group>
  )
}
