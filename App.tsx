import React, { useState, useEffect } from "react";
import { WebSocketMessageEvent } from "./types";
import Message from './message';
import Chat from './chat';
//import logo from "./logo.svg";
import "./App.css";

const App: React.FC = () => {
  const [recipient, setRecipient] = useState("");

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
