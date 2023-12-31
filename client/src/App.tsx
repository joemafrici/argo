import { useState, useEffect } from 'react'
import Login from './Login'
import { Message, ConversationPreview, Conversation } from './Types'
import Chat from './Chat'
import ChatList from './ChatList'
import { fetchUserConversations, fetchNewConversation } from './api'
import './App.css'
import { useWebSocket } from './useWebSocket'

function App() {
  console.log('in App');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationID, setSelectedConversationID] = useState<string | null>(null);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [username, setUsername] = useState('');
  const [renderLogin, setRenderLogin] = useState(true);
  
  const handleLogin = (username: string) => {
    setUsername(username);
    setRenderLogin(false);
  }
  const handleConversationSelect = (conversationID: string) => {
    setSelectedConversationID(conversationID);
  }
  const handleCreateNewConversation = async (participantUsername: string) => {
    const newConversation = await fetchNewConversation(username, participantUsername);
    if (newConversation) {
      console.log('new conversation received:', newConversation);
      setConversations(prev => [...prev, newConversation]);
      setSelectedConversationID(newConversation.ID);
    } else {
      console.log('handleCreateNewConversation unable to fetch new conversation');
    }
  }
  const handleWebSocketMessage = (newMessage: Message) => {
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(conv => conv.ID === newMessage.ConvID);
      if (conversationIndex >= 0) {
        const updatedConversation = {
          ...prevConversations[conversationIndex],
          Messages: [...prevConversations[conversationIndex].Messages, newMessage],
        };
        const updatedConversations = [
          ...prevConversations.slice(0, conversationIndex),
          updatedConversation,
          ...prevConversations.slice(conversationIndex + 1),
        ];
        return updatedConversations;
      } else {
        const newConversation: Conversation = {
          ID: newMessage.ConvID,
          Participants: [newMessage.From, username],
          Messages: [newMessage],
        };
        return [...prevConversations, newConversation];
      }
    });
  };

  const socket = useWebSocket(
    username ? `ws://localhost:3001/ws?username=${encodeURIComponent(username)}` : '',
    handleWebSocketMessage
  );

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

  const generatePreviews = (conversations: Conversation[]): ConversationPreview[] => {
    const previews = conversations.map((conversation: Conversation) => {
      const mostRecentMessage = conversation.Messages[conversation.Messages.length - 1];
      return {
        ID: conversation.ID,
        MostRecentMessage: mostRecentMessage,
      }
    });
    return previews
  };

  useEffect(() => {
    const previews = generatePreviews(conversations);
    setConversationPreviews(previews);
  }, [conversations]);
  return (
    <>
      { renderLogin && <Login onLogin={handleLogin}/> }
      <ChatList 
        conversationPreviews={conversationPreviews}
        onConversationSelect={handleConversationSelect}
        onCreateNewConversation={handleCreateNewConversation}
      />
      <Chat conversation={selectedConversation} socket={socket} username={username}/>
    </>
  )
}

export default App
