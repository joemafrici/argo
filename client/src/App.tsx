import { useState, useEffect } from 'react'
import Login from './Login'
import { Message, ConversationPreview, Conversation } from './Types'
import Chat from './Chat'
import ChatList from './ChatList'
import { fetchUserConversations, fetchNewConversation } from './api'
import './App.css'
import { useWebSocket } from './useWebSocket'
import { getUsernameFromToken } from './utils'
import Register from './Register'

function App() {
  console.log('in App');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationID, setSelectedConversationID] = useState<string | null>(null);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('token'));

  const handleRegisterSuccess = () => {
   setRegisterSuccessMessage('Registration successful.. You can now log in to your account.'); 
  }
  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true)
  }
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  }
  const handleConversationSelect = (conversationID: string) => {
    setSelectedConversationID(conversationID);
  }
  const handleCreateNewConversation = async (participantUsername: string) => {
    const username = getUsernameFromToken()
    if (username) {
      const newConversation = await fetchNewConversation(username, participantUsername);
      if (newConversation) {
        console.log('new conversation received:', newConversation);
        setConversations(prev => [...prev, newConversation]);
        setSelectedConversationID(newConversation.ID);
      } else {
        console.log('handleCreateNewConversation unable to fetch new conversation');
      }
    }
  }
  const handleWebSocketMessage = (newMessage: Message) => {
    console.log('in handleWebSocketMessage');
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
          Participants: [newMessage.From, getUsernameFromToken()!],
          Messages: [newMessage],
        };
        return [...prevConversations, newConversation];
      }
    });
  };
  const username = getUsernameFromToken();
  const socket = useWebSocket(
    username ? 'ws://localhost:3001/ws' : '',
    handleWebSocketMessage
  );

  const selectedConversation = conversations.find(c => c.ID === selectedConversationID);


  useEffect(() => {
    const loadConversations = async () => {
      const fetchedConversations = await fetchUserConversations();
      console.log('fetchedConversations');
      console.log(fetchedConversations);
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
    const token = localStorage.getItem('token');
    if (token) {
      loadConversations();
    }
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

  if (!isLoggedIn) {
    return (<> 
      { registerSuccessMessage && <div>{registerSuccessMessage}</div> }
      <Register onRegisterSuccess={handleRegisterSuccess}/>
      <Login onLogin={handleLogin}/>
    </>);
  }

  return (
    <>
      <ChatList 
        conversationPreviews={conversationPreviews}
        onConversationSelect={handleConversationSelect}
        onCreateNewConversation={handleCreateNewConversation}
      />
      <Chat conversation={selectedConversation} socket={socket} username={getUsernameFromToken()!}/>
      <button onClick={handleLogout}>Logout</button>
    </>
  )
}

export default App
