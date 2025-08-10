import { useState, useEffect, useRef, useCallback } from 'react';

export default function useFloatingMessages() {
  // State to hold all active floating messages
  const [messages, setMessages] = useState([]);
  // Ref to keep track of the next unique ID for messages
  const nextMessageId = useRef(0);

  /**
   * Adds a new floating message to the display.
   * @param {number} x - X coordinate for the message origin.
   * @param {number} y - Y coordinate for the message origin.
   * @param {string} text - The text content of the message.
   * @param {number} [duration=2] - How long the message should be visible in seconds.
   * @param {string} [sourceId=''] - Optional ID of the source unit (e.g., 'central-ai').
   * @param {string} [color='yellow'] - Optional color for the message text.
   */
  const showMessage = useCallback((x, y, text, duration = 2, sourceId = '', color = 'yellow') => {
    const newMessage = {
      id: `msg-${nextMessageId.current++}`, // Unique ID for React key
      x,
      y,
      text,
      duration,
      sourceId,
      color,
      timestamp: Date.now(), // For potential cleanup logic
    };

    setMessages(prevMessages => {

      return [...prevMessages, newMessage];
    });

    // Schedule message removal after its duration
    setTimeout(() => {
      setMessages(prevMessages => {

        return prevMessages.filter(msg => msg.id !== newMessage.id);
      });
    }, duration * 1000); // Convert seconds to milliseconds
  }, []); // No dependencies needed as setMessages and nextMessageId.current are stable

  // Return the messages state and the showMessage function
  return [messages, showMessage];
}
