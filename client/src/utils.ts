import { jwtDecode, JwtPayload } from 'jwt-decode';
import { openDB } from 'idb';

interface Token extends JwtPayload {
  username: string;
}

export const getUsernameFromToken = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decoded = jwtDecode<Token>(token);
      if (decoded.username) {
        return decoded.username;
      } else {
        // showMessage('Invalid session. Please log in again.');
        // logoutUser();
        // redirectToLogin();
        return '';
      }
    } catch (error) {
      console.error('Token decoding error:', error);
      // showMessage('Your session has expired. Please log in again');
      // logoutUser();
      // redirectToLogin();
    }
  }
  return '';
}

export async function generateKeyPair(): Promise<CryptoKeyPair | null> {
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
  return keyPair;
  } catch (error) {
    console.error('Failed to generate key pair:', error);  
    return null;
  }
}
export function base64ToArrayBuffer(base64: string): ArrayBuffer | null {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let ii = 0; ii < len; ++ii) {
      bytes[ii] = binaryString.charCodeAt(ii);
    }
    return bytes.buffer;
  } catch (err) {
    console.error('Failed to convert base64 to ArrayBuffer:', err); 
    return null;
  }
}
export function arrayBufferToBase64(buffer: ArrayBuffer): string | null {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let ii = 0; ii < bytes.byteLength; ++ii) {
      binary += String.fromCharCode(bytes[ii]);
    }
    return window.btoa(binary);
  } catch (err) {
    console.error('Failed to convert ArrayBuffer to base64:', err); 
    return null;
  }
}
export async function storeKeyPair(publicKey: CryptoKey, encryptedPrivateKey: string): Promise<void> {
  try {
    const db = await openDB('database', 1, {
      upgrade(db) {
        db.createObjectStore('keys', { keyPath: 'id'});
      },
    });
    
    const exportedPublicKey = await window.crypto.subtle.exportKey('spki', publicKey);    

    await db.put('keys', { id: 'public key', key: exportedPublicKey});
    await db.put('keys', { id: 'private key', key: encryptedPrivateKey});

  } catch (error) {
    console.error('Failed to store key pairs:', error);
  }
}
export async function importPublicKey(keyData: string): Promise<CryptoKey | null> {
  try {
    const keyBuffer: ArrayBuffer | null = base64ToArrayBuffer(keyData);
    if (keyBuffer) {
      const pubKey: CryptoKey = await window.crypto.subtle.importKey(
        'spki', 
        keyBuffer, 
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true, 
        ['encrypt'],
      );
      return pubKey;
    }
    throw "keyBuffer is null";
  
  } catch (err) {
    console.error('Failed to import public key:', err);    
    return null;
  }
}
export async function encryptPrivateKey(privKey: CryptoKey, password: string): Promise<string | null> {
  try {
    const privKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privKey);
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      derivedKey,
      privKeyBuffer,
    );

    const resultBuffer = new Uint8Array(iv.byteLength + salt.byteLength + encryptedKeyBuffer.byteLength);
    resultBuffer.set(new Uint8Array(iv), 0);
    resultBuffer.set(new Uint8Array(salt), iv.byteLength);
    resultBuffer.set(new Uint8Array(encryptedKeyBuffer), iv.byteLength + salt.byteLength);

    return arrayBufferToBase64(resultBuffer);

  } catch (err) {
    console.error('Failed to encrypt private key', err); 
    return null;
  }
}
export async function decryptPrivateKey(encryptedData: string, password: string): Promise<CryptoKey | null> {
  try {
    const dataBuffer = base64ToArrayBuffer(encryptedData);
    if (dataBuffer) {
      const iv = dataBuffer.slice(0, 12);
      const salt = dataBuffer.slice(12, 28);
      const encryptedKeyBuffer = dataBuffer.slice(28);
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
        ['decrypt'],
      );

      const privateKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, },
        derivedKey,
        encryptedKeyBuffer
      );

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt', 'encrypt']
      );

      return privateKey;
    }else {
      throw 'Error encryptedKeyBuffer null';
      
    }
  } catch (err) {
    console.error('Failed to decrypt private key:', err);
    return null;
  }
}
