import { useState, useEffect } from 'react'
import Login from './Login'
import { Message, ConversationPreview } from './Types'
import Chat from './Chat'
import ChatList from './ChatList'
import { fetchUserConversations } from './api'
import './App.css'


function App() {
  const [conversations, setConversations] = useState<Conversation[]>({});
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>({});
  const [username, setUsername] = useState('deepwater');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [renderLogin, setRenderLogin] = useState(true);


  //let conversationPreviews = buildConversationPreviews(); 

  const handleLogin = (username: string) => {
    setUsername(username);
    setRenderLogin(false);
  }
  // const addMessageToConversation = (conversationID: string, message: Message) => {
  //   setConversations(prevConversations => {
  //     const updatedConversations = { ...prevConversations };
  //     if (!updatedConversations[conversationID]) {
  //       updatedConversations[conversationID] = [];
  //     }
  //     updatedConversations[conversationID].push(message);
  //     return updatedConversations;
  //   });
  // }

  useEffect(() => {
    const loadConversations = async () => {
      const fetchedConversations = await fetchUserConversations(username);
      if (fetchedConversations) {
        setConversations(fetchedConversations)
      }
    };
    // make sure this doesn't get called until loadConversations is done
    // const buildConversationPreviews = () => {
    //   const conversationPreviews: ConversationPreview[];
    // };

    loadConversations();
    console.log(conversations);
    // buildConversationPreviews();
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
      {/* <ChatList conversationPreviews={conversationPreviews}/> */}
      <Chat socket={socket} username={username}/>
    </>
  )
}

export default App
