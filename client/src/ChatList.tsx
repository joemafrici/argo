import React from 'react'
import { ConversationPreview } from './Types';
interface ChatListProps {
  conversationPreviews: ConversationPreview[];
  onConversationSelect: (conversationID: string) => void;
}

const ChatList: React.FC<ChatListProps> = ( { conversationPreviews, onConversationSelect } ) => {
  console.log('in ChatList');
  const chatListUI = conversationPreviews.map(conversationPreview => 
    <li key={conversationPreview.ID} onClick={() => onConversationSelect(conversationPreview.ID)}>
      <p>{conversationPreview.MostRecentMessage.From}: {conversationPreview.MostRecentMessage.Content}</p>
    </li>
  );
  return (
    <>
      <ul>{chatListUI}</ul>
    </>
  );
}

export default ChatList;
