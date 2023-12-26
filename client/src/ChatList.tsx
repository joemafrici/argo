import React from 'react'
interface ChatListProps {
  socket: WebSocket | null;
  username: string;
}

const ChatList: React.FC<ChatListProps> = ( { socket, username } ) => {
  const chatListUI = chatHistory.map(chat => 
    <li key={chat.id}>
      <p>{chat.otherUser}</p>
    </li>
  );
  return (
    <>
      <ul>{chatListUI}</ul>
    </>
  );
}

export default ChatList;
