import { describe, it, expect, vi, afterEach } from 'vitest';
import { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './Login';
import * as api from '../../api';

vi.mock('../../api', () => ({
  login: vi.fn(),
}));

describe('Login', () => {
  //it('', async () => {});
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('renders login inputs and a button', () => {
    render(<Login onLogin={vi.fn()} setUsername={vi.fn()} />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i})).toBeInTheDocument();
  });
  it('calls setUsername and onLogin when form is submitted', async () => {
    const mockOnLogin = vi.fn();
    const mockSetUsername = vi.fn();
    const username = 'testuser1';
    const password = 'password';

    (api.login as unknown as Mock).mockResolvedValue('fake-token');

    render(<Login onLogin={mockOnLogin} setUsername={mockSetUsername} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: username },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: password },
    });

    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    expect(mockSetUsername).toHaveBeenCalledWith(username);

    await vi.waitFor(() => {
      expect(api.login).toHaveBeenCalledWith(username, password);
    });
    await vi.waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('fake-token');
    });
  });
  it('displays an error when login fails', async () => {
    const errorMessage = 'Failed to login. Check your username and password';
    // (api.login as unknown as Mock).mockRejectedValue(new Error(errorMessage));
    vi.mocked(api.login).mockRejectedValueOnce(new Error(errorMessage));

    render(<Login onLogin={vi.fn()} setUsername={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'testuser'},
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password'},
    });
    fireEvent.submit(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
  test.todo('updates input fields correctly');
  test.todo('shows an error message when input fields are empty and submit is clicked');
  test.todo('displays a loading indicator when the form is submitted');
  test.todo('calls the correct function after successful login');
  test.todo('does not call the onLogin function on login failure');
  test.todo('stores the token in local storage on successful behavior');
});
