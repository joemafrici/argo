import React from 'react';
import { Message as MessageType } from '../../types';

type MessageProps = {
  message: MessageType
  onDelete: (messageID: string, conversationID: string) => void;
  isOwnMessage: boolean;
};

const MessageComponent: React.FC<MessageProps> = ({ message, onDelete, isOwnMessage }) => {
  return (
    <>
      <li className={`p-3 ${isOwnMessage ? 'bg-blue-100': 'bg-gray-100'} my-1 mx-2 rounded-lg`}>
      <div className='flex justify-between items-center'>
        <span className='font-medium'>{message.From}</span>
          {isOwnMessage && (
            <button onClick={() => onDelete(message.ID, message.ConvID)} className='text-red-500 hover:text-red-700'>
            Delete
            </button>
          )}
      </div>
        <p>{message.Content}</p>
      </li>
    </>
  );
};
export default MessageComponent;
