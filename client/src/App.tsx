import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'
import ChatList from './components/ChatList'
import Register from './components/Register'
import './App.css'
import { useWebSocket } from './hooks/useWebSocket'
import useAuth from './hooks/useAuth'
import useConversations from './hooks/useConversations'
import { getUsernameFromToken } from './utils'

function App() {
  const [username, setUsername] = useState<string>('');
  const [shouldConnect, setShouldConnect] = useState<boolean>(false);
  const {
    isLoggedIn,
    registerSuccessMessage,
    handleLogin,
    handleLogout,
    handleRegisterSuccess
  } = useAuth();
  const {
    conversations,
    selectedConversationID,
    conversationPreviews,
    handleConversationSelect,
    handleCreateNewConversation,
    handleNewMessage,
  } = useConversations(username, isLoggedIn);

  const handleAppLogin = useCallback((token: string) => {
    handleLogin(token);
    setShouldConnect(true);
  }, [handleLogin]);
  const handleAppLogout = useCallback(() => {
    handleLogout();
    setShouldConnect(false);
  }, [handleLogout]);

  const token = localStorage.getItem('token');
  const { sendMessage } = useWebSocket(shouldConnect, token, handleNewMessage);

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

  if (!isLoggedIn) {
    return (
      <> 
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
