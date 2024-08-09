import React, { useState, useMemo } from 'react';
import { useConversationContext } from '../contexts/ConversationContext';

const Conversation: React.FC = () => {
	const { selectedConversation, sendMessage, isWebSocketConnected } = useConversationContext();
	const [messageInput, setMessageInput] = useState('');

	const currentUsername = localStorage.getItem('username');

	const otherParticipant = useMemo(() => {
		if (!selectedConversation || !currentUsername) return '';
		const otherUsername = Object.keys(selectedConversation.Participants)
			.find(username => username !== currentUsername);
		return otherUsername || 'Unknown user';
	}, [selectedConversation, currentUsername]);

	const handleSendMessage = () => {
		if (messageInput.trim() === '' || !selectedConversation) return;
		sendMessage(selectedConversation.ID, messageInput);
		setMessageInput('');
	};

	if (!selectedConversation) return (<div>No conversation selected...</div>);
	if (!isWebSocketConnected) return (<div>No conversation selected...</div>);

	return (
		<div className='conversation'>
			<h2>{otherParticipant}</h2>
			<div className='messages'>
				{selectedConversation.Messages.map((msg) => (
					<div
						key={msg.ID}
						className={`message ${msg.From === currentUsername ? 'sent' : 'received'}`}
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
