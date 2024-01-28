import { describe, it, vi, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import App from './App';
import { useWebSocket } from './hooks/useWebSocket';
import { getUsernameFromToken } from './utils';

vi.mock('./hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => {
    const sendMessage = vi.fn();
    // need to do setup I think
    // setup websocket and who knows what else
    return sendMessage
  })
}));

vi.mock('./utils', () => ({
  getUsernameFromToken: vi.fn().mockReturnValue('testuser'),
}));

describe('App Component', () => {
  //it('', () => {});
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should log out correctly', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'token') {
        return 'fake-token';
      }
      return null;
    });

    Storage.prototype.removeItem = vi.fn();

    render(<App />);

    fireEvent.click(screen.getByText('Logout'));

    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
  });
});
