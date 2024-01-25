import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Register from './Register';
import * as api from '../../api';

vi.mock('../../api', () => ({
  register: vi.fn(),
}));

describe('Register Component', () => {
  //it('', () => {});
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles form submission correctly', async () => {
    const mockOnRegisterSuccess = vi.fn();
    const mockSetUsername = vi.fn();

    render(<Register onRegisterSuccess={mockOnRegisterSuccess} setUsername={mockSetUsername} />);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } });
    fireEvent.submit(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockOnRegisterSuccess).toHaveBeenCalled();
      expect(mockSetUsername).toHaveBeenCalledWith('newuser');
    });
  });
  it('handles successful registration', async () => {
    const mockOnRegisterSuccess = vi.fn();
    const mockSetUsername = vi.fn();

    vi.mocked(api.register).mockResolvedValueOnce(undefined);

    render(<Register onRegisterSuccess={mockOnRegisterSuccess} setUsername={mockSetUsername}/>);

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser1' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } });
    fireEvent.submit(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(mockOnRegisterSuccess).toHaveBeenCalled();
      expect(mockSetUsername).toHaveBeenCalledWith('newuser1');
    });
  });

  test.todo('updates input fields correctly');
  test.todo('shows an error message when required fields are empty and submit is clicked');
  test.todo('displays an error when registration fails');
  test.todo('clears input fields after successful registration');
});
