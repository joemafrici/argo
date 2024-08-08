import React, { useState } from 'react';
import { useConversationContext } from '../contexts/ConversationContext';

const Conversation: React.FC = () => {
	const { selectedConversation } = useConversationContext();
	const [messageInput, setMessageInput] = useState('');

	const handleSendMessage = () => {
		if (messageInput.trim() === '') return;
		//sendMessage(selectedConversationId, messageInput);
		setMessageInput('');
	};

	if (!selectedConversation) return (<div>No conversation selected...</div>);

	return (
		<div className='conversation'>
			<h2>{selectedConversation.ID}</h2>
			<div className='messages'>
				{selectedConversation.Messages.map((msg) => (
					<div
						key={msg.ID}
						className={`message ${msg.From === localStorage.getItem('username') ? 'sent' : 'received'}`}
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
					onKeyUp={(e) => e.key === 'Enter' && handleSendMessage()}
				/>
				<button onClick={handleSendMessage}>Send</button>
			</div>
		</div >
	);
};
export default Conversation
