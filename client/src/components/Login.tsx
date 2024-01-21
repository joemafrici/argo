import { useState } from 'react'
import { login } from '../api'
type LoginProps = {
  onLogin: (token: string) => void;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
};

const Login: React.FC<LoginProps> = ({ onLogin, setUsername }) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUsername(usernameInput);
    if (usernameInput && password) {
      try {
        const token = await login(usernameInput, password);
        onLogin(token);
      } catch(err) {
        setError('Faild to login. Check your username and password');
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
