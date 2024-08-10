import React, { useState } from 'react';
import { useConversationContext } from '../contexts/ConversationContext';


const Sidebar: React.FC = () => {
	const { conversations, selectConversation, selectedConversation, createNewConversation } = useConversationContext();
	const [newParticipant, setNewParticipant] = useState('');

	const currentUsername = localStorage.getItem('username');

	const handleNewConversation = async () => {
		if (newParticipant && newParticipant != currentUsername) {
			await createNewConversation(currentUsername, newParticipant);
			setNewParticipant('');
		}
	};
	return (
		<div className='sidebar'>
			<h2>Conversations</h2>
			<ul>
				{conversations.map((conv) => (
					<li
						key={conv.ID}
						onClick={() => selectConversation(conv.ID)}
						className={conv.ID === selectedConversation?.ID ? 'selected ' : ''}
					>
						<div className='conversation-name'>{Object.keys(conv.Participants).find(username => username !== currentUsername)}</div>
						<div className='last-message'>{conv.LastMessage}</div>
					</li>
				))}
			</ul>
			<div className='new-conversation'>
				<input
					type='text'
					value={newParticipant}
					onChange={(e) => setNewParticipant(e.target.value)}
					placeholder='Enter username...'
				/>
				<button onClick={handleNewConversation}>New Conversation</button>
			</div>
		</div>
	);
};
export default Sidebar
