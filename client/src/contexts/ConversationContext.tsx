import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import { Conversation } from '../sampleData';
import { useConversations } from '../hooks/useConversations';
import { useWebSocket } from '../hooks/useWebSocket';
import * as ConversationUtils from '../models/conversation'

interface ConversationContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  selectConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  isWebSocketConnected: boolean;
  createNewConversation: (currentUser: string, participant: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { conversations, isLoading, error, setConversations } = useConversations();
  const { socket, isConnected, sendMessage: wsSendMessage } = useWebSocket('ws://localhost:3001/ws');
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  const selectConversation = (conversationId: string) => setSelectedConversationId(conversationId);
  const selectedConversation = conversations.find((c) => c.ID === selectedConversationId) || null;

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!selectedConversation) throw new Error('unable to craft message. no conversation selected');
    const message = {
      type: 'message',
      ConvID: conversationId,
      To: selectedConversation.Participants[Object.keys(selectedConversation.Participants).find(p => p != localStorage.getItem('username')) || '']?.Username || '',
      From: localStorage.getItem('username'),
      Content: await ConversationUtils.encryptMessageContent(selectedConversation, content),
    };
    wsSendMessage(message);
  }, [selectedConversation, wsSendMessage]);

  const createNewConversation = useCallback(async (currentUser: string, participant: string) => {
    const newConversation = await ConversationUtils.createNewConversation([currentUser, participant]);
    setConversations(prevConversations => [...prevConversations, newConversation]);
  }, [setConversations]);


  useEffect(() => {
    if (socket) {
      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data) {
          const updatedConversation = conversations.find((c) => c.ID === data.ConvID);
          if (updatedConversation) {
            try {
              const decryptedMessage = await ConversationUtils.decryptMessage(data, updatedConversation);
              setConversations(prevConversations =>
                prevConversations.map(conv =>
                  conv.ID === data.ConvID ? { ...conv, Messages: [...conv.Messages, decryptedMessage] } : conv
                )
              );
            } catch (error) {
              console.error("Error decrypting message:", error);
            }
          }
        }
      };
    }

    return () => {
      if (socket) {
        socket.onmessage = null;
      }
    };
  }, [socket, conversations]);

  return (
    <ConversationContext.Provider value={{
      conversations,
      selectedConversation,
      isLoading,
      error,
      selectConversation,
      sendMessage,
      isWebSocketConnected: isConnected,
      createNewConversation,
    }}>
      {children}
    </ConversationContext.Provider>
  )

}

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be within a ConversationProvider');
  }
  return context;
};
