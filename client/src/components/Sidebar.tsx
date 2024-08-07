import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '../sampleData';

interface SidebarProps {
	conversations: Conversation[];
	onSelect: (id: string) => void;
	selectedId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ conversations, onSelect, selectedId }) => {
	const navigate = useNavigate();
	const handleLogoutClick = () => {
		navigate('/login');
	};

	return (
		<div className='sidebar'>
			<h2>Conversations</h2>
			<ul>
				{conversations.map((conv) => (
					<li
						key={conv.id}
						onClick={() => onSelect(conv.id)}
						className={conv.id === selectedId ? 'selected ' : ''}
					>
						<div className='conversation-name'>{conv.name}</div>
						<div className='last-message'>{conv.lastMessage}</div>
					</li>
				))}
			</ul>
			<button className='logout-button' onClick={() => handleLogoutClick()}>Logout</button>
		</div>
	);
};
export default Sidebar
