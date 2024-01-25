import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from './Chat';

describe('Chat Component', () => {
  const mockSendMessage = vi.fn();
  const testUsername = 'testuser';
  const testConversation = {
    ID: 'conv1',
    Participants: ['testuser', 'otheruser'],
    Messages: [
      { ID: 'msg1', To: 'otheruser', From: 'testuser', Content: 'Hi there', ConvID: 'conv1' },
      { ID: 'msg2', To: 'testuser', From: 'otheruser', Content: 'Hello', ConvID: 'conv1' },
      { ID: 'msg3', To: 'otheruser', From: 'testuser', Content: 'How are you?', ConvID: 'conv1' },
    ],
  };

  it('renders messages from the conversation', () => {
    render(<Chat sendMessage={mockSendMessage} username={testUsername} conversation={testConversation}/>);
    testConversation.Messages.forEach((message) => {
      expect(screen.getByText(`${message.From}: ${message.Content}`)).toBeInTheDocument();
    });
  });

  it('calls sendMessage when send button is clicked with valid input', async () => {
    render(<Chat sendMessage={mockSendMessage} username={testUsername} conversation={testConversation} />);
    const input = screen.getByRole('textbox');
    const message = 'Hello World';

    fireEvent.change(input, { target: { value: message } });
    fireEvent.click(screen.getByText(/send/i));

    expect(mockSendMessage).toHaveBeenCalledWith({
      ID: '',
      To: 'otheruser',
      From: testUsername,
      Content: message,
      ConvID: testConversation.ID,
    });
    expect(input).toHaveValue('');
  });

  test.todo('updates textarea correctly as the user type');
  test.todo('does not call sendMessage with empty or whitespace-only message');
  test.todo('displays "Select a conversation to start chatting" when no conversation is selected');
});
