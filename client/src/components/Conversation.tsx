import React, { useState } from 'react';
import { Message, Conversation as ConversationType } from '../sampleData';
interface ConversationProps {
	conversation: ConversationType;
	onSendMessage: (message: Message) => void;
}

const Conversation: React.FC<ConversationProps> = ({ conversation, onSendMessage }) => {
	const [messageInput, setMessageInput] = useState('');

	const handleSendMessage = () => {
		if (messageInput.trim() === '') return;
		const newMessage: Message = {
			id: String(Date.now()),
			sender: 'joe',
			content: messageInput,
			timestamp: new Date().toISOString(),
		}
		onSendMessage(newMessage);
		setMessageInput('');
	};

	const handleEnterKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			handleSendMessage();
		}
	};

	return (
		<div className='conversation'>
			<h2>{conversation.name}</h2>
			<div className='messages'>
				{conversation.messages.map((msg) => (
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
					onKeyUp={handleEnterKeyUp}
				/>
				<button onClick={handleSendMessage}>Send</button>
			</div>
		</div >
	);
};
export default Conversation
