import React, { useState } from 'react';
import { register } from './api';

type RegisterProps = {
  onRegisterSuccess: () => void;
};

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess: onRegisterSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (username && password) {
      try {
        await register(username, password);
        onRegisterSuccess();
      } catch (err) {
        setError('Failed to register');
      } 
    } else {
      setError('Enter both username and password');
    }
    setUsername('');
    setPassword('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type='text' value={username} placeholder={'Username'}
        onChange={e => setUsername(e.target.value)} />
      <input type='password' value={password} placeholder={'Password'}
        onChange={e => setPassword(e.target.value)} />
      {error && <div>{error}</div>}
      <button type='submit'>Register</button>
    </form>
  )
}
export default Register;
