import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base64ToArrayBuffer, arrayBufferToBase64, KeyManager } from '../utils/encrypt';

interface LoginResponse {
	token: string,
	keys: {
		public: string,
		encryptedPrivate: string,
		saltBase64: string
	};
}
const Login: React.FC = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		try {
			if (!(username && password)) {
				setError('Enter username and password');
			}

			setIsLoading(true);
			if (isLogin) {
				await handleLogin();
				navigate('/home');
			} else {
				await handleRegister();
			}

		} catch (e: any) {
			setError(e)
		} finally {
			setIsLoading(false);
		}
	}

	const handleLogin = async () => {
		const response = await fetch('http://localhost:3001/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ Username: username, Password: password }),
		});
		const loginResponse = (await response.json()) as LoginResponse
		if (loginResponse.token) {
			localStorage.setItem('token', loginResponse.token);
			localStorage.setItem('username', username);
			localStorage.setItem('saltBase64', loginResponse.keys.saltBase64);
			const salt = base64ToArrayBuffer(loginResponse.keys.saltBase64);
			const keyManager = KeyManager.getInstance();
			const derivedKey = await keyManager.deriveKey(password, salt);
			await keyManager.storeDerivedKey(derivedKey);
			localStorage.setItem('publicKey', loginResponse.keys.public);
			localStorage.setItem('privateKey', loginResponse.keys.encryptedPrivate);
		} else {
			throw new Error('token is not valid');
		}
	}

	const handleRegister = async () => {
		const keyManager = KeyManager.getInstance();
		const keyPair = await keyManager.generateKeyPair();
		if (keyPair) {
			const salt = window.crypto.getRandomValues(new Uint8Array(16));
			const saltBase64 = arrayBufferToBase64(salt);
			const derivedKey = await keyManager.deriveKey(password, salt);
			const encryptedPrivateKey = await keyManager.encryptPrivateKey(keyPair.privateKey, derivedKey);
			const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

			const publicKey = arrayBufferToBase64(publicKeyArrayBuffer);
			fetch('http://localhost:3001/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey: encryptedPrivateKey, saltBase64 }),
			})
				.then(response => {
					if (!response.ok) {
						console.error('Failed to register: ', response.status);
					}
				})
				.catch(error => {
					console.error('Error registering: ', error);
				});
		} else {
			throw new Error('keyPair not valid');
		}
	}

	if (isLoading) return (<div>Loading...</div>)
	if (error) return (<div>Something went horribly wrong!</div>)

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
