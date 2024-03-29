import React, { useState } from 'react';

type RegisterProps = {
  onRegister: (username: string, password: string) => void;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
};

const Register: React.FC<RegisterProps> = ({ onRegister, setUsername }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUsername(usernameInput);
    if (usernameInput && password) {
      try {
        //await register(usernameInput, password);
        onRegister(usernameInput, password);
      } catch (err) {
        setError('Failed to register');
      } 
    } else {
      setError('Enter both username and password');
    }
    setUsernameInput('');
    setPassword('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type='text' value={usernameInput} placeholder={'Username'}
        onChange={e => setUsernameInput(e.target.value)} />
      <input type='password' value={password} placeholder={'Password'}
        onChange={e => setPassword(e.target.value)} />
      {error && <div>{error}</div>}
      <button type='submit'>Register</button>
    </form>
  )
}
export default Register;
