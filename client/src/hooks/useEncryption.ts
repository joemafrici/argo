import { useEffect, useState, useRef } from 'react';
import { arrayBufferToBase64, base64ToArrayBuffer, generateSalt } from '../utils';
import { sendSalt } from '../api';
import { useDerivedKey } from '../contexts/DerivedKey';

const useEncryption = (isLoggedIn: boolean) => {
  const [tempPassword, setTempPassword] = useState<string>('');
  const { derivedKey, setDerivedKey } = useDerivedKey();

  useEffect(() => {
    const generateAndSetDerivedKey = async () => {
      if (isLoggedIn && tempPassword) {
        const salt = generateSalt();
        const derivedKeyTemp = await generateDerivedKey(tempPassword, salt);
        //setDerivedKey(derivedKeyTemp);
        console.log('setting derived key..');
        setDerivedKey(derivedKeyTemp);
        console.log('derived key: ', derivedKey);
        sendSalt(salt);
        setTempPassword('');
      }
    };
    console.log('useEffect in useEncryption triggered..');
    generateAndSetDerivedKey();
  }, [isLoggedIn, tempPassword]);

  const generateDerivedKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    console.log('Generating derived key');
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    const derivedKey = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return derivedKey;
  }
  const encryptPrivateKey = async (privKey: CryptoKey): Promise<string | null> => {
    try {
      if (!derivedKey) {
        throw new Error('Derived key is not set');
      }

      const privKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privKey);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        privKeyBuffer
      );

      const resultBuffer = new Uint8Array(iv.byteLength + encryptedKeyBuffer.byteLength);
      resultBuffer.set(new Uint8Array(iv), 0);
      resultBuffer.set(new Uint8Array(encryptedKeyBuffer), iv.byteLength);
      return arrayBufferToBase64(resultBuffer);
    } catch (err) {
      console.error('Failed to encrypt private key', err); 
      return null;
    }
  }
  const decryptPrivateKey = async (encryptedData: string): Promise<CryptoKey> => {
    if (!derivedKey) {
      throw new Error('Derived key is not set');
    }
    const dataBuffer = base64ToArrayBuffer(encryptedData);
    if (!dataBuffer) {
      throw new Error('Failed to convert encrypted data to ArrayBuffer');
    }
    const iv = dataBuffer.slice(0, 12);
    const encryptedKeyBuffer = dataBuffer.slice(12);

    const privateKeyBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      encryptedKeyBuffer
    ).catch(err => {
        throw new Error('Failed to decrypt private key: ' + err);
    });

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256'},
      true,
      ['encrypt', 'decrypt']
    ).catch(err => {
        throw new Error('Failed to import private key: ' + err);
    });

    return privateKey;
  }

  const encryptMessage = async (message: string): Promise<string> => {
    console.log('in encryptMessage.. derived key:', derivedKey);
    if (!derivedKey) {
      throw new Error('Derived key is not set');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedMessage = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      new TextEncoder().encode(message)
    );

    const combined = new Uint8Array(iv.length + encryptedMessage.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedMessage), iv.length);

    try {
      return arrayBufferToBase64(combined.buffer);
    } catch (err) {
      throw new Error('Failed to convert encrypted message to base64: ' + err);
    }
  }
  const decryptMessage = async (combined: ArrayBuffer): Promise<string> => {
    console.log('in decryptMessage.. derived key:', derivedKey);
    if (!derivedKey) {
      throw new Error('Derived key is not set');
    }

    const iv = combined.slice(0, 12);
    const encryptedMessage = combined.slice(12);
    const decryptedMessage = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv,},
      derivedKey,
      encryptedMessage
    );

    return new TextDecoder().decode(decryptedMessage);
  }

  return {
    generateDerivedKey,
    encryptMessage,
    decryptMessage,
    encryptPrivateKey,
    decryptPrivateKey,
    setTempPassword,
  }
}
export default useEncryption;
