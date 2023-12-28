import React from 'react'
import { ConversationPreview } from './Types';
interface ChatListProps {
  conversationPreviews: ConversationPreview[];
}

const ChatList: React.FC<ChatListProps> = ( { conversationPreviews } ) => {
  const chatListUI = conversationPreviews.map(conversationPreview => 
    <li key={conversationPreview.id}>
      <p>{conversationPreview.mostRecentMessage.from}</p>
      <p>{conversationPreview.mostRecentMessage.content}</p>
    </li>
  );
  return (
    <>
      <ul>{chatListUI}</ul>
    </>
  );
}

export default ChatList;
