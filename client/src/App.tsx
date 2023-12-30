import { useState, useEffect } from 'react'
import Login from './Login'
import { ConversationPreview, Conversation } from './Types'
import Chat from './Chat'
import ChatList from './ChatList'
import { fetchUserConversations } from './api'
import './App.css'

function App() {
  console.log('in App');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationID, setSelectedConversationID] = useState<string | null>(null);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [renderLogin, setRenderLogin] = useState(true);

  const handleLogin = (username: string) => {
    setUsername(username);
    setRenderLogin(false);
  }
  const handleConversationSelect = (conversationID: string) => {
    setSelectedConversationID(conversationID);
  }

  const selectedConversation = conversations.find(c => c.ID === selectedConversationID);

  useEffect(() => {
    const loadConversations = async () => {
      const fetchedConversations = await fetchUserConversations(username);
      if (fetchedConversations) {
        setConversations(fetchedConversations)
        const previews = fetchedConversations.map((conversation: Conversation) => {
          const mostRecentMessage = conversation.Messages[conversation.Messages.length - 1];
          return {
            ID: conversation.ID,
            MostRecentMessage: mostRecentMessage,
          }
        });
        setConversationPreviews(previews);
      }
    };

    loadConversations();
  }, [username]);

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
      socket.onerror = (event: Event) => {
        console.error("Websocket Error:", event);
      };

      setSocket(socket);
    }

    return () => {
      socket?.close();
    }
  }, [username]);

  return (
    <>
      { renderLogin && <Login onLogin={handleLogin}/> }
      <ChatList 
        conversationPreviews={conversationPreviews}
        onConversationSelect={handleConversationSelect}
      />
      <Chat conversation={selectedConversation} socket={socket} username={username}/>
    </>
  )
}

export default App
