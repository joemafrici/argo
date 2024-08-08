import { useState, useContext, createContext } from 'react';
import { Conversation } from '../sampleData';
import { useConversations } from '../hooks/useConversations';
interface ConversationContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  selectConversation: (id: string) => void;
  //sendMessage: (conversationId: string, content: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { conversations, isLoading, error } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  const selectConversation = (conversationId: string) => setSelectedConversationId(conversationId);

  const selectedConversation = conversations.find((c) => c.ID === selectedConversationId) || null;

  return (
    <ConversationContext.Provider value={{
      conversations,
      selectedConversation,
      isLoading,
      error,
      selectConversation,
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
