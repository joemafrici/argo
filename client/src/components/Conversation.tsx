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
			ConvId: 'fix this',
			Id: String(Date.now()),
			From: 'joe',
			To: 'socrates',
			Content: messageInput,
			Timestamp: new Date().toISOString(),
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
			<h2>{conversation.ID}</h2>
			<div className='messages'>
				{conversation.Messages.map((msg) => (
					<div
						key={msg.ID}
						className={`message ${msg.From === 'You' ? 'sent' : 'received'}`}
					>
						<div className='message-content'>{msg.Content}</div>
						<div className='message-timestamp'>{new Date(msg.Timestamp).toLocaleTimeString()}</div>
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
