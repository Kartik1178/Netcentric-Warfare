// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"], 
  reconnectionAttempts: 5,   
  timeout: 5000              
});

export default socket;
