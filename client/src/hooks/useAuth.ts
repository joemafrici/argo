import { useState, useCallback } from 'react'
import { LoginResponse } from '../types';
import { arrayBufferToBase64, encryptPrivateKey, importPublicKey, storeKeyPair } from '../utils';
import { register } from '../api';

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('token'));
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string>('');

  const handleLogin = useCallback(async (resp: LoginResponse) => {
    try {
      localStorage.setItem('token', resp.token);
      const pubKey: CryptoKey | null = await importPublicKey(resp.keys.public);
      if (pubKey) {
        await storeKeyPair(pubKey, resp.keys.encryptedPrivate);
        setIsLoggedIn(true)
      } else {
        throw new Error('Failed to import public key');
      }
    } catch (err) {
      setIsLoggedIn(false)
      console.error('Failed to log in', err);
    }
  }, []);
  const handleRegister = useCallback (async (username: string, password: string) => {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      const encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey, password);
      if (encryptedPrivateKey) {
        const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const publicKeyBase64 = arrayBufferToBase64(publicKeyArrayBuffer);
        if (publicKeyBase64) {
          await register(username, password, publicKeyBase64, encryptedPrivateKey);
          await storeKeyPair(keyPair.publicKey, encryptedPrivateKey);
          setRegisterSuccessMessage('Registration successful.. You can now log in to your account.'); 
        } else {
          throw new Error('Unable to convert public key to base64');
        }
      } else {
        throw new Error('Failed to encrypt private key');
      }
    } catch (err) {
      console.error('Failed to register account:', err); 
    }
  }, []);
  const handleLogout = useCallback(async () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  }, []);

  return { isLoggedIn, registerSuccessMessage, handleLogin, handleLogout, handleRegister};
}
export default useAuth;
