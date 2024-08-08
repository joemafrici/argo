import React from 'react';
import { useConversationContext } from '../contexts/ConversationContext';


const Sidebar: React.FC = () => {
	const { conversations, selectConversation, selectedConversation } = useConversationContext();
	const currentUsername = localStorage.getItem('username');
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
		</div>
	);
};
export default Sidebar
