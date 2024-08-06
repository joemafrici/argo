import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (username && password) {
			await new Promise(resolve => setTimeout(resolve, 1000));

			localStorage.setItem('token', 'dummy_token');

			navigate('/home');
		} else {
			setError('Enter username and password');
		}
	}

	return (
		<div className='login-container'>
			<h2>{isLogin ? 'Login' : 'Register'}</h2>
			{error && <p className='error'>{error}</p>}
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor='username'>Username:</label>
					<input type='text' id='username' value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</div>
				<div>
					<label htmlFor='password'>Password:</label>
					<input type='password' id='password' value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<button type='submit'>{isLogin ? 'Login' : 'Register'}</button>
			</form >
			<p>
				{isLogin ? "Don't have an account?" : "Already have an account?"}
				<button onClick={() => setIsLogin(!isLogin)}>
					{isLogin ? 'Register' : 'Login'}
				</button>
			</p>
		</div>
	);
};
export default Login
