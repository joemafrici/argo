import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'
import ChatList from './components/ChatList'
import Register from './components/Register'
import { Message, ConversationPreview, Conversation } from './types'
import { fetchUserConversations, fetchNewConversation } from './api'
import './App.css'
import { useWebSocket } from './hooks/useWebSocket'
import useAuth from './hooks/useAuth'
import { getUsernameFromToken } from './utils'

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationID, setSelectedConversationID] = useState<string | null>(null);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [username, setUsername] = useState<string>('');
  const [shouldConnect, setShouldConnect] = useState<boolean>(false);
  const {
    isLoggedIn,
    registerSuccessMessage,
    handleLogin,
    handleLogout,
    handleRegisterSuccess
  } = useAuth();

  const handleAppLogin = useCallback((token: string) => {
    handleLogin(token);
    setShouldConnect(true);
  }, [handleLogin]);
  const handleAppLogout = useCallback(() => {
    handleLogout();
    setShouldConnect(false);
  }, [handleLogout]);

  const handleConversationSelect = (conversationID: string) => {
    setSelectedConversationID(conversationID);
  }
  const handleCreateNewConversation = async (participantUsername: string) => {
    if (username) {
      const newConversation = await fetchNewConversation(username, participantUsername);
      if (newConversation) {
        setConversations(prev => [...prev, newConversation]);
        setSelectedConversationID(newConversation.ID);
      } else {
        console.error('handleCreateNewConversation unable to fetch new conversation');
      }
    }
  }
  const handleWebSocketMessage = useCallback((newMessage: Message) => {
    console.log('setting conversations');
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
          Participants: [newMessage.From, username!],
          Messages: [newMessage],
        };
        return [...prevConversations, newConversation];
      }
    });
  }, [setConversations]);

  const token = localStorage.getItem('token');
  const { sendMessage } = useWebSocket(shouldConnect, token, handleWebSocketMessage);

  const selectedConversation = conversations.find(c => c.ID === selectedConversationID);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const usernameFromToken = getUsernameFromToken();
      setUsername(usernameFromToken);
    } else {
      setUsername('');
    }
  }, []);
  useEffect(() => {
    console.log('fetching conversations');
    const loadConversations = async () => {
      const fetchedConversations = await fetchUserConversations();
      console.log(`conversations fetched ${fetchedConversations}`);
      if (fetchedConversations) {
        console.log('fetchedConversations not null');
        setConversations(fetchedConversations)
        const previews = fetchedConversations.map((conversation: Conversation) => {
          const mostRecentMessage = conversation.Messages[conversation.Messages.length - 1];
          return {
            ID: conversation.ID,
            MostRecentMessage: mostRecentMessage,
          }
        });
        console.log('setting conversation previews');
        console.log(previews);
        setConversationPreviews(previews);
      }
    };
    if (isLoggedIn) {
      loadConversations();
    }
  }, [isLoggedIn]);

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
      <Register setUsername={setUsername} onRegisterSuccess={handleRegisterSuccess}/>
      <Login setUsername={setUsername} onLogin={handleAppLogin}/>
    </>);
  }

  return (
    <>
      <ChatList 
        conversationPreviews={conversationPreviews}
        onConversationSelect={handleConversationSelect}
        onCreateNewConversation={handleCreateNewConversation}
      />
      {selectedConversation &&
        <Chat 
          sendMessage={sendMessage}
          username={username!}
          conversation={selectedConversation}
        />
      }
      <button onClick={handleAppLogout}>Logout</button>
    </>
  )
}

export default App
