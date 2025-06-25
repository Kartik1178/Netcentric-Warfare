
import GridCanvas from "./MapSimulatuion/GridCanvas";
import { useState } from "react"; 
import { useEffect } from "react";
import socket from "./socket";
export function TerritoryMap() {
    const [objects, setObjects] = useState([]);
    const [logs, setLogs] = useState([]);
  
    useEffect(() => {
      
      setObjects([
        { id: "m1", type: "missile", x: 300, y: 450 },
        { id: "a1", type: "antenna", x: 420, y:325 },
        { id: "r1", type: "radar", x: 420, y: 465 },
        { id: "l1", type: "launcher", x: 560, y: 325 },
        { id: "j1", type: "jammer", x: 560, y: 465 }
      ]);
    }, []);
    useEffect(() => {
      const interval = setInterval(() => {
        setObjects((prev) => prev.map(obj => {
          return obj;
        }));
      }, 100);
  
      return () => clearInterval(interval);
    }, []);


  
    return (
      <div className="flex flex-col">
   
      <div className="flex justify-center items-center">
      <GridCanvas objects={objects} />
      </div>
      </div>
    );
  }