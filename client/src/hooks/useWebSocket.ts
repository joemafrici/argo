import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, SystemMessage, Conversation } from './../types';
import handleLogout from './useAuth';

export function useWebSocket(shouldConnect: boolean,
  token: string | null, 
  onMessage: (newMessage: Message, decryptMessage: (message: string) => Promise<string>) => void,
  onConversationUpdate: (updatedConversation: Conversation) => void,
  decryptMessage: (message: string) => Promise<string>
) {
  const sockRef = useRef<WebSocket | null>(null);
  const [ retryCount, setRetryCount ] = useState(0);
  const timeoutIDRef = useRef<number | null>(null);
  const messageQueueRef = useRef<Message[]>([]);

  const sendMessage = useCallback((message: Message) => {
    if (sockRef.current?.readyState === WebSocket.OPEN) {
      sockRef.current.send(JSON.stringify(message));
    } else {
      console.log(`adding ${message} to queue`);
      messageQueueRef.current.push(message);
    }
  }, []);
  const sendSystemMessage = useCallback((message: SystemMessage) => {
    if (sockRef.current?.readyState === WebSocket.OPEN) {
      sockRef.current.send(JSON.stringify(message));
    } else {
      console.log('WebSocket is not open. Unable to send system message');
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    console.log('in connectWebSocket');
    if (timeoutIDRef.current !== null) {
      clearTimeout(timeoutIDRef.current);
      timeoutIDRef.current = null;
    }

    const newSocket = new WebSocket('ws://localhost:3001/ws');
    sockRef.current = newSocket;

    newSocket.onopen = () => {
      setRetryCount(0);
      if (token) {
        sendSystemMessage({ type: 'authenticate', token });
      } else {
        console.error('Token is null during WebSocket connection');
        newSocket.close();
        handleLogout();
      }

      while (messageQueueRef.current.length > 0) {
        console.log('sending message that was in queue');
        const message = messageQueueRef.current.shift();
        if (message) {
          sendMessage(message);
        }
      }
    };
    newSocket.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      console.log('received message: ', data);
      if (data.type && data.type === 'ping') {
        sendSystemMessage({ type: 'pong' });
      } else if (data.type && data.type === 'conversationUpdate') {
        onConversationUpdate(data.conversation);
      } else {
        onMessage(data, decryptMessage);
      }
    };
    newSocket.onclose = event => {
      console.log('WebSocket closed', event);
      console.log('WebSocket readyState', newSocket.readyState);
      if (shouldConnect) {
        console.log('Attempting to reconnect...');
        setRetryCount(prevRetryCount => prevRetryCount + 1);
      }
    }
    newSocket.onerror = event => {
      console.error('WebSocket error', event);
      console.error('WebSocket readyState', newSocket.readyState);
      newSocket.close();
    }
  }, [token, sendMessage, shouldConnect]);

  useEffect(() => {
    if (retryCount > 0) {
      const retryDelay = Math.min(10000, (Math.pow(2, retryCount) - 1) * 1000);
      console.log(`Reconnecting in ${retryDelay}ms...`);
      timeoutIDRef.current = setTimeout(connectWebSocket, retryDelay);
    }
  }, [retryCount, connectWebSocket]);

  useEffect(() => {
    if (shouldConnect && token) {
      console.log('in useEffect calling connectWebSocket..');
      connectWebSocket();
    }

    return () => {
      if (sockRef.current) {
      sockRef.current.close();
      }
      if (timeoutIDRef.current !== null) {
        clearTimeout(timeoutIDRef.current);
      }
    };
  }, [shouldConnect, token, connectWebSocket]);

  return { sendMessage, sendSystemMessage };
}
