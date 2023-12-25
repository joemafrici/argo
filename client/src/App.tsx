import React, { useState, useEffect } from "react";
import { WebSocketMessageEvent } from "./types";
import Message from './message';
import Chat from './chat';
//import logo from "./logo.svg";
import "./App.css";

const App: React.FC = () => {
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connect = () => {
    const socket = new WebSocket(
      `ws://localhost:3001/ws?username=${encodeURIComponent(username)}`,
    );
    socket.onopen = () => console.log("onopen called");
    socket.onclose = (event: CloseEvent) => {
      if (event.wasClean) {
        console.log(
          `connection closed cleanly... code=${event.code}, reason=${event.reason}`,
        );
      } else {
        console.log("connection died");
      }
    };
    socket.onmessage = (event: WebSocketMessageEvent) => {
      console.log(event.data);
      setResponses((prev) => [...prev, event.data]);
    };
    socket.onerror = (event: Event) => {
      console.error("Websocket Error:", event);
    };

    setSocket(socket);
  };

  const sendMessage = () => {
    if (socket) {
      const messageToSend: typeof Message = {
        recipient,
        content: message,
      };
      socket.send(JSON.stringify(messageToSend));
    }
  };

  const closeConnection = () => {
    socket?.close(1000, "user closed connection");
  };

  useEffect(() => {
    return () => {
      socket?.close();
    };
  }, [socket]);

  return (
    <>
      <label htmlFor="username">
        Username
        <input type="text" id="username"value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <button type="button" onClick={connect}>Connect</button>
      <textarea rows={5} cols={10} value={message} onChange={e => setMessage(e.target.value)} />
      <label htmlFor="recipient">
        Recipient
        <input type="text" id="recipient"value={recipient} onChange={e => setRecipient(e.target.value)} />
      </label>
      <button type="button" onClick={sendMessage}>Send Message</button>
      <button type="button" onClick={closeConnection}>Close Connection</button>
      <Chat />
      <div>
      </div>
    </>
  );
};

export default App;
