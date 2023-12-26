import { useState, useEffect } from 'react'
import Login from './Login'
import { Message } from './Chat'
import Chat from './Chat'
import ChatList from './ChatList'
import './App.css'

type Conversations = {
  [id: string]: Message[]
}

function App() {
  const [conversations, setConversations] = useState<Conversations>({});
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [renderLogin, setRenderLogin] = useState(true);

  const handleLogin = (username: string) => {
    setUsername(username);
    setRenderLogin(false);
  }
  const addMessageToConversation = (conversationID: string, message: Message) => {
    setConversations(prevConversations => {
      const updatedConversations = { ...prevConversations };
      if (!updatedConversations[conversationID]) {
        updatedConversations[conversationID] = [];
      }
      updatedConversations[conversationID].push(message);
      return updatedConversations;
    });
  }

  useEffect(() => {
    if (username) {
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
      // socket.onmessage = (event: MessageEvent) => {
      //   console.log(event.data);
      //   setResponses((prev) => [...prev, event.data]);
      // };
      socket.onerror = (event: Event) => {
        console.error("Websocket Error:", event);
      };

      setSocket(socket);
    }

    return () => {
      socket?.close();
      //setRenderLogin(true);
    }
  }, [username]);

  return (
    <>
      { renderLogin && <Login onLogin={handleLogin}/> }
      <ChatList />
      <Chat socket={socket} username={username}/>
    </>
  )
}

export default App
