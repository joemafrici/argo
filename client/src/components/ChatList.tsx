import React, { useState } from 'react'
import { ConversationPreview } from '../types';
interface ChatListProps {
  conversationPreviews: ConversationPreview[];
  onConversationSelect: (conversationID: string) => void;
  onCreateNewConversation: (username: string) => void;
}

const ChatList: React.FC<ChatListProps> = ( { conversationPreviews, onConversationSelect, onCreateNewConversation } ) => {
  const [showNewConversationField, setShowNewConversationField] = useState(false);
  const [newParticipant, setNewParticipant] = useState('');

  const handleCreateClick = () => {
    setShowNewConversationField(true);
  }
  const handleNewConversationSubmit = () => {
    if (newParticipant) {
      onCreateNewConversation(newParticipant);
      setNewParticipant('');
      setShowNewConversationField(false);
    }
  }
  const chatListUI = conversationPreviews.map(conversationPreview => {
    const mostRecentMessage = conversationPreview.MostRecentMessage;
    return (
      <li key={conversationPreview.ID} onClick={() => onConversationSelect(conversationPreview.ID)}>
        {mostRecentMessage ? (
          <p>{mostRecentMessage.From}: {mostRecentMessage.Content}</p>
        ) : (
          <p>New Conversation</p>
        )}
      </li>
    )
  });
  return (
    <>
      <p>List of conversations</p>
      <ul>{chatListUI}</ul>
      {showNewConversationField ? (
        <div>
          <input type='text' placeholder='Enter username' value={newParticipant}
          onChange={(e) => setNewParticipant(e.target.value)}/>
          <button onClick={handleNewConversationSubmit}>Create</button>
        </div>
      ) : (
        <button onClick={handleCreateClick}>New Conversation</button> 
      )}
    </>
  );
}

export default ChatList;
