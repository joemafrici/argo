import React from 'react';

type MessageProps = {
  sender: string;
  recipient: string;
  content: string;
  id: string;
}
//const uuid = crypto.randomUUID();

const Message: React.FC<MessageProps> = ({ sender, content }) => {
  return (
    <div className="message">
      <strong>{sender}</strong>: {content}
    </div>
  );
};

export default Message
