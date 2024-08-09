import { useState, useEffect, useCallback } from 'react';
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}
export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = (() => {
      setIsConnected(true);
      const token = localStorage.getItem('token');
      if (token) {
        ws.send(JSON.stringify({ type: 'authenticate', token }));
      }
    });
    ws.onclose = (() => {
      setIsConnected(false);
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  return { socket, isConnected, sendMessage };
};
