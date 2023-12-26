import { useState, useEffect } from 'react'
import './App.css'

function Message({ content }: { content: string }) {
  return (
    <li>{content}</li>
  );
}

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

function App() {
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const handleLogin = (username: string) => {
    setUsername(username);
  }

  useEffect(() => {
    if (username) {
      const socket = new WebSocket(
        `ws://localhost:3001/ws?username=${encodeURIComponent(username)}`,
      );
      socket.onopen = () => console.log("onopen called");
      socket.onclose = (event: CloseEvent) => {
        if (event.wasClean) {
          console.log(
            `connection closed cleanly... code=${event.code}, reason=${event.reason}`,
          );
        } else {
          console.log("connection died");
        }
      };
      socket.onmessage = (event: MessageEvent) => {
        console.log(event.data);
        //setResponses((prev) => [...prev, event.data]);
      };
      socket.onerror = (event: Event) => {
        console.error("Websocket Error:", event);
      };

      setSocket(socket);
    }

    return () => {

    }
  }, [username]);

  return (
    <>
      <Login onLogin={handleLogin}/>
      <ul>
        <Message content='hello socrates' />
        <Message content='hello deepwater' />
      </ul>
    </>
  )
}

export default App
