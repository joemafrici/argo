const CONFIG = {
	RSA_MODULUS_LENGTH: 2048,
	AES_KEY_LENGTH: 256,
	PBKDF2_ITERATIONS: 100000,
	SALT_LENGTH: 16,
};

export class KeyManager {
	private static instance: KeyManager;
	private constructor() { }

	static getInstance(): KeyManager {
		if (!KeyManager.instance) {
			KeyManager.instance = new KeyManager();
		}
		return KeyManager.instance;
	}

	async generateKeyPair(): Promise<CryptoKeyPair> {
		return await crypto.subtle.generateKey(
			{
				name: 'RSA-OAEP',
				modulusLength: CONFIG.RSA_MODULUS_LENGTH,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: 'SHA-256',
			},
			true,
			['encrypt', 'decrypt']
		);
	}

	async generateSymmetricKey(): Promise<CryptoKey> {
		return await crypto.subtle.generateKey(
			{
				name: 'AES-GCM',
				length: CONFIG.AES_KEY_LENGTH
			},
			true,
			['encrypt', 'decrypt']
		);
	}

	async deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
		const passwordKey = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(password),
			{ name: 'PBKDF2' },
			false,
			['deriveKey'],
		);
		return await crypto.subtle.deriveKey(
			{ name: 'PBKDF2', salt, iterations: CONFIG.PBKDF2_ITERATIONS, hash: 'SHA-256' },
			passwordKey,
			{ name: 'AES-GCM', length: CONFIG.AES_KEY_LENGTH },
			true,
			['encrypt', 'decrypt']
		);
	}

	async encryptPrivateKey(privKey: CryptoKey, derivedKey: CryptoKey): Promise<string> {
		const privKeyBuffer = await crypto.subtle.exportKey('pkcs8', privKey);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encryptedKeyBuffer = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			derivedKey,
			privKeyBuffer
		);

		const resultBuffer = new Uint8Array(iv.byteLength + encryptedKeyBuffer.byteLength);
		resultBuffer.set(new Uint8Array(iv), 0);
		resultBuffer.set(new Uint8Array(encryptedKeyBuffer), iv.byteLength);
		return arrayBufferToBase64(resultBuffer);
	}

	async decryptPrivateKey(encryptedData: string, derivedKey: CryptoKey): Promise<CryptoKey> {
		const dataBuffer = base64ToArrayBuffer(encryptedData);
		const iv = dataBuffer.slice(0, 12);
		const encryptedKeyBuffer = dataBuffer.slice(12);

		const privateKeyBuffer = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			derivedKey,
			encryptedKeyBuffer
		);

		return await crypto.subtle.importKey(
			'pkcs8',
			privateKeyBuffer,
			{ name: 'RSA-OAEP', hash: 'SHA-256' },
			true,
			['decrypt']
		);
	}

	generateSalt(): Uint8Array {
		return crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
	}

	async storeDerivedKey(derivedKey: CryptoKey): Promise<void> {
		const jwk = await crypto.subtle.exportKey('jwk', derivedKey);
		const jwkString = JSON.stringify(jwk);
		localStorage.setItem('derivedKey', jwkString);
	}

	async retrieveDerivedKey(): Promise<CryptoKey | null> {
		const jwkString = localStorage.getItem('derivedKey');
		if (jwkString) {
			const jwk = JSON.parse(jwkString);
			return await crypto.subtle.importKey(
				'jwk',
				jwk,
				{ name: 'AES-GCM' },
				false,
				['decrypt']
			);
		}
		return null;
	}

	async encryptSymmetricKey(symmetricKey: ArrayBuffer, publicKey: CryptoKey): Promise<string> {
		try {
			const encryptedKey = await window.crypto.subtle.encrypt(
				{
					name: 'RSA-OAEP'
				},
				publicKey,
				symmetricKey
			);

			return arrayBufferToBase64(encryptedKey);
		} catch (err) {
			console.error('Failed to encrypt symmetric key:', err);
			throw new Error('Failed to encrypt symmetric key');
		}
	}
	async decryptSymmetricKey(encryptedSymmetricKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
		try {
			const encryptedKeyBuffer = base64ToArrayBuffer(encryptedSymmetricKey);
			const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
				{
					name: 'RSA-OAEP'
				},
				privateKey,
				encryptedKeyBuffer
			);

			const symmetricKey = await window.crypto.subtle.importKey(
				'raw',
				decryptedKeyBuffer,
				{
					name: 'AES-GCM',
					length: 256
				},
				true,   // extractable
				['encrypt', 'decrypt']
			);

			return symmetricKey;
		} catch (err) {
			console.error('Failed to decrypt symmetric key:', err);
			throw new Error('Failed to decrypt symmetric key');
		}
	}
}

export class Encryptor {
	private keyManager: KeyManager;

	constructor() {
		this.keyManager = KeyManager.getInstance();
	}

	async encryptMessage(message: string, symmetricKey: CryptoKey): Promise<string> {
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encodedMessage = new TextEncoder().encode(message);

		const encryptedData = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			symmetricKey,
			encodedMessage
		);

		const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
		encryptedArray.set(iv, 0);
		encryptedArray.set(new Uint8Array(encryptedData), iv.length);

		return arrayBufferToBase64(encryptedArray.buffer);
	}

	async decryptMessage(encryptedMessage: string, symmetricKey: CryptoKey): Promise<string> {
		if (encryptedMessage === '') return '';
		const encryptedData = base64ToArrayBuffer(encryptedMessage);
		const iv = encryptedData.slice(0, 12);
		const data = encryptedData.slice(12);

		const decryptedData = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: new Uint8Array(iv) },
			symmetricKey,
			data
		);

		return new TextDecoder().decode(decryptedData);
	}

	// ... (other methods)
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}
