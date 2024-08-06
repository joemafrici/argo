import React from 'react';
import { Conversation as ConversationType } from '../sampleData';
interface ConversationProps {
	conversation: ConversationType;
}

const Conversation: React.FC<ConversationProps> = ({ conversation }) => {
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
				<input type='text' placeholder='Enter message...' />
				<button>Send</button>
			</div>
		</div>
	);
};
export default Conversation
