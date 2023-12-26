import { useState } from 'react'
type LoginProps = {
  onLogin: (username: string) => void;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username) {
      onLogin(username);
    }

  }
  return (
    <form onSubmit={handleSubmit}>
      <input type='text' value={username} 
        onChange={e => setUsername(e.target.value)}
        placeholder='Enter username'/>
      <button type='submit'>Login</button>
    </form>
  );
}

export default Login
