import React, { useState } from 'react'
import { login } from '../../api'
import { LoginResponse } from '../../types';

type LoginProps = {
  onLogin: (resp: LoginResponse) => void;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  isLoggedIn: boolean;
  setTempPassword: React.Dispatch<React.SetStateAction<string>>
};

const Login: React.FC<LoginProps> = ({ onLogin, setUsername, isLoggedIn, setTempPassword }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // useEffect(() => {
  //   if (isLoggedIn && password) {
  //     setTempPassword(password);
  //     setPassword('');
  //   }
  // }, [isLoggedIn, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUsername(usernameInput);
    if (usernameInput && password) {
      try {
        const resp: LoginResponse = await login(usernameInput, password);
        onLogin(resp);
        console.log('Before setTempPassword in Login', { isLoggedIn, password });
        setTempPassword(password);
        setPassword('');
      } catch(err) {
        setError('Failed to login. Check your username and password');
      }
    } else {
      setError('Enter both username and password');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type='text' value={usernameInput} 
        onChange={e => setUsernameInput(e.target.value)}
        placeholder='Username'/>
      <input type='password' value={password} 
        onChange={e => setPassword(e.target.value)}
        placeholder='Password'/>
      {error && <div>{error}</div>}
      <button type='submit'>Login</button>
    </form>
  );
}

export default Login
