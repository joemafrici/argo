import { useState, useEffect, useCallback } from 'react'
import Login from './components/login/Login'
import Chat from './components/chat/Chat'
import ChatList from './components/chatlist/ChatList'
import Register from './components/register/Register'
import './App.css'
import { useWebSocket } from './hooks/useWebSocket'
import useAuth from './hooks/useAuth'
import useConversations from './hooks/useConversations'
import { getUsernameFromToken } from './utils'
import { LoginResponse } from './types'
import useEncryption from './hooks/useEncryption'
import { Message } from './types'

function App() {
  const [username, setUsername] = useState<string>('');
  const [shouldConnect, setShouldConnect] = useState<boolean>(false);
  const {
    isLoggedIn,
    registerSuccessMessage,
    handleLogin,
    handleLogout,
    handleRegister, 
  } = useAuth();
  const {
    conversations,
    selectedConversationID,
    conversationPreviews,
    handleConversationSelect,
    handleCreateNewConversation,
    handleNewMessage,
    handleConversationUpdate,
  } = useConversations(username, isLoggedIn);
  const { setTempPassword } = useEncryption(isLoggedIn);
  const {
    encryptMessage,
    decryptMessageRef,
  } = useEncryption(isLoggedIn);

  const handleAppLogin = useCallback((resp: LoginResponse) => {
    handleLogin(resp);
    setShouldConnect(true);
  }, [handleLogin]);
  const handleAppLogout = useCallback( async () => {
    await handleLogout();
    setShouldConnect(false);
  }, [handleLogout]);

  const token = localStorage.getItem('token');

  const handleEncryptedMessage = useCallback(async (encryptedMessage: Message) => {
    try {
      const decryptedContent = await decryptMessageRef.current(encryptedMessage.Content);
      const decryptedMessage: Message = {
        ...encryptedMessage,
        Content: decryptedContent
      }
      handleNewMessage(decryptedMessage);
    } catch (err) {
      console.error('Failed to decrypt message:', err);      
    }
  }, [decryptMessageRef, handleNewMessage]);
  const { sendMessage } = useWebSocket(shouldConnect, token, handleEncryptedMessage, handleConversationUpdate, decryptMessageRef.current);

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
      <Register setUsername={setUsername} onRegister={handleRegister}/>
      <Login setUsername={setUsername} onLogin={handleAppLogin} isLoggedIn={isLoggedIn} setTempPassword={setTempPassword}/>
    </>);
  }

  return (
    <>
      <div className='flex h-screen bg-gray-100'>
        <aside className='w-1/3 border-r'>
          <ChatList 
            conversationPreviews={conversationPreviews}
            onConversationSelect={handleConversationSelect}
            onCreateNewConversation={handleCreateNewConversation}
          />
        </aside>
        <main className='w-2/3'>
          {selectedConversation &&
            <Chat 
              sendMessage={sendMessage}
              username={username!}
              conversation={selectedConversation}
              encryptMessageHandler={encryptMessage}
            />
          }
          <button onClick={handleAppLogout}>Logout</button>
        </main>
      </div>
    </>
  )
}

export default App;
