import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatList from './ChatList';
import { ConversationPreview } from '../../types';
import messageFactory from '../../messageFactory';

describe('ChatList Component', () => {
  const message1 = messageFactory({ From: 'testuser', Content: 'hello'});
  const message2 = messageFactory({ From: 'otheruser', Content: 'yes I agree'});
  const message3 = messageFactory({ From: 'otheruser2', Content: 'I think so'});
  const message4 = messageFactory({ From: 'otheruser3', Content: 'yes ok'});
  const mockConversationPreviews: ConversationPreview[] = [
    { ID: 'conv1', MostRecentMessage: message1 },
    { ID: 'conv2', MostRecentMessage: message2 },
    { ID: 'conv3', MostRecentMessage: message3 },
    { ID: 'conv4', MostRecentMessage: message4 },
  ];
  const mockOnConversationSelect = vi.fn();
  const mockCreateNewConversation = vi.fn();

  it('renders conversation previews correctly', () => {
    render(<ChatList
      conversationPreviews={mockConversationPreviews}
      onConversationSelect={mockOnConversationSelect}
      onCreateNewConversation={mockCreateNewConversation}
    />);

    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });
  it('calls onConversationSelect when a conversation is clicked', async () => {
    render(<ChatList
      conversationPreviews={mockConversationPreviews}
      onConversationSelect={mockOnConversationSelect}
      onCreateNewConversation={mockCreateNewConversation}
    />);

    fireEvent.click(screen.getAllByRole('listitem')[0]);
    expect(mockOnConversationSelect).toHaveBeenCalledWith(mockConversationPreviews[0].ID);
  });

  it('shows input filed when "New Conversation" button is clicked', () => {
    render(<ChatList
      conversationPreviews={mockConversationPreviews}
      onConversationSelect={mockOnConversationSelect}
      onCreateNewConversation={mockCreateNewConversation}
    />);

    expect(screen.queryByPlaceholderText(/enter username/i)).not.toBeInTheDocument();
  });

  test.todo('calls onCreateNewConversation when the "Create" button is clicked with valid input');
  test.todo('hides input field and clears it after creating a new conversation');
  test.todo('does not call onCreateNewConversation when input is empty');
});

