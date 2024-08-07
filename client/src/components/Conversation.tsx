import React, { useState } from 'react';
import { Message, Conversation as ConversationType } from '../sampleData';
interface ConversationProps {
	conversation: ConversationType;
}

const Conversation: React.FC<ConversationProps> = ({ conversation: initialConversation }) => {
	const [messages, setMessages] = useState<Message[]>(initialConversation.messages);
	const [messageInput, setMessageInput] = useState('');

	const handleSendMessage = () => {
		console.log('in handleSendMessage');
		if (messageInput.trim() === '') return;
		const newMessage: Message = {
			id: String(Date.now()),
			sender: 'joe',
			content: messageInput,
			timestamp: new Date().toISOString(),
		}
		setMessages(prevMessages => [...prevMessages, newMessage]);
		setMessageInput('');
		console.log('message added to conversation');
	};

	const handleEnterKeyUp = (e) => {
		if (e.key === 'Enter') {
			handleSendMessage();
		}
	};

	return (
		<div className='conversation'>
			<h2>{initialConversation.name}</h2>
			<div className='messages'>
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`message ${msg.sender === 'You' ? 'sent' : 'received'}`}
					>
						<div className='message-content'>{msg.content}</div>
						<div className='message-timestamp'>{new Date(msg.timestamp).toLocaleTimeString()}</div>
					</div>
				))}
			</div>
			<div className='message-input'>
				<input
					type='text'
					value={messageInput}
					placeholder='Enter message...'
					onChange={(e) => setMessageInput(e.target.value)}
					onKeyUp={(e) => handleEnterKeyUp(e)}
				/>
				<button onClick={handleSendMessage}>Send</button>
			</div>
		</div >
	);
};
export default Conversation
