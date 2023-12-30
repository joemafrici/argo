import React from 'react'
import { ConversationPreview } from './Types';
interface ChatListProps {
  conversationPreviews: ConversationPreview[];
}

const ChatList: React.FC<ChatListProps> = ( { conversationPreviews } ) => {
  console.log('in ChatList');
  console.log(conversationPreviews);
  const chatListUI = conversationPreviews.map(conversationPreview => 
    <li key={conversationPreview.id}>
      <p>{conversationPreview.mostRecentMessage.From}: {conversationPreview.mostRecentMessage.Content}</p>
    </li>
  );
  return (
    <>
      <ul>{chatListUI}</ul>
    </>
  );
}

export default ChatList;
