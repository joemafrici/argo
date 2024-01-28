import React, { useState } from 'react'
import { ConversationPreview } from '../../types';
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
      <ul className='overflow-auto h-5/6'>{chatListUI}</ul>
      <div className='h-1/6 bg-gray-100 p-4 flex items-center'>
      {showNewConversationField ? (
        <div className='flex-grow'>
          <input className='border rounded p-2 w-full' type='text' placeholder='Enter username' value={newParticipant}
          onChange={(e) => setNewParticipant(e.target.value)}/>
          <button className='mt-2 bg-blue500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full' 
              onClick={handleNewConversationSubmit}>Create</button>
        </div>
      ) : (
        <button className='bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 w-full' onClick={handleCreateClick}>New Conversation</button> 
      )}
      </div>
    </>
  );
}

export default ChatList;
