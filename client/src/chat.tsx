import React from 'react';

const Chat: React.FC = () => {
  return (
    <>
      <ul></ul>
      responses.map((response, index) => (
        <p key={index}>{response}</p>
      ))
    </>
  )
}

export default Chat
