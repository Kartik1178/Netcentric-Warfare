import { useState, useCallback } from "react";

export default function useFloatingMessages() {
  const [messages, setMessages] = useState([]);

  const showMessage = useCallback((x, y, text, duration = 2, source = "global") => {
    const id = Date.now() + Math.random();
    const newMessage = { id, x, y, text, duration,source};
    setMessages((prev) => [...prev, newMessage]);

    // Remove after `duration` seconds
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, duration * 1000);
  }, []);

  return [messages, showMessage];
}
