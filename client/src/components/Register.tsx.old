import React, { useState } from "react"
import * as encrypt from '../utils/encrypt.ts';

interface RegisterFormData {
	username: string;
	password: string;
}
const Register: React.FC = () => {
	const [formData, setFormData] = useState<RegisterFormData>({
		username: '',
		password: '',
	});
	const [error, setError] = useState<string | null>(null);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prevState => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);

		try {
			const keyPair = await encrypt.generateKeyPair();
			if (keyPair) {
				const salt = window.crypto.getRandomValues(new Uint8Array(16));
				const saltBase64 = encrypt.arrayBufferToBase64(salt);
				const derivedKey = await encrypt.generateDerivedKey(formData.password, salt);
				const encryptedPrivateKey = await encrypt.encryptPrivateKey(keyPair.privateKey, derivedKey);
				const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

				const publicKey = encrypt.arrayBufferToBase64(publicKeyArrayBuffer);
				fetch('http://localhost:3001/api/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ Username: formData.username, Password: formData.password, PublicKey: publicKey, EncryptedPrivateKey: encryptedPrivateKey, SaltBase64: saltBase64 }),
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
		} catch (error) {
			console.error('Failed to generate public/private key pair:', error);
		}
	};

	return (
		<>
			<h2>Register</h2>
			{error && <p className="error">{error}</p>}
			<form onSubmit={handleSubmit}>
				<input
					type="text" name="username" value={formData.username} placeholder="username"
					onChange={handleChange} required
				/>
				<input
					type="text" name="password" value={formData.password} placeholder="password"
					onChange={handleChange} required
				/>
				<button type="submit" name="submit">Login</button>
			</form>
		</>
	)
};
export default Register
