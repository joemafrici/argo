export async function sendKeys(publicKey, encryptedPrivateKey) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  } 
  const response = await fetch(`http://localhost:3001/api/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ publicKey, encryptedPrivateKey }),
  });
  if (!response.ok) {
    throw new Error('Failed to send keys');
  }
}
export async function sendSalt(salt) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('token not found');
  }
  let saltBase64;
  try {
    saltBase64 = arrayBufferToBase64(salt);
  } catch (err) {
    throw new Error('Failed to convert salt to base64: ' + err);    
  }

  const response = await fetch('http://localhost:3001/api/salt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ salt: saltBase64 }),
  });
  if (!response.ok) {
    throw new Error('Failed to send salt');
  }
}
//************************************************
export async function generateKeyPair() {
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
//************************************************
export function base64ToArrayBuffer(base64) {
  try {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let ii = 0; ii < len; ++ii) {
      bytes[ii] = binaryString.charCodeAt(ii);
    }
    return bytes.buffer;
  } catch (err) {
    throw new Error('Failed to convert base64 to ArrayBuffer: ' + err);
  }
}
//************************************************
export function arrayBufferToBase64(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let ii = 0; ii < bytes.byteLength; ++ii) {
      binary += String.fromCharCode(bytes[ii]);
    }
    return window.btoa(binary);
  } catch (err) {
    throw new Error('Failed to convert ArrayBuffer to base64: ' + err);
  }
}
//************************************************
// Transforms keyData into CryptoKey object for use in Web Cryptogrophy API
export async function createPublicCryptoKey(keyData) {
  try {
    const keyBuffer = base64ToArrayBuffer(keyData);
    if (keyBuffer) {
      const pubKey = await window.crypto.subtle.importKey(
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
    throw new Error("keyBuffer is null");
  } catch (err) {
    console.error('Failed to import public key:', err);    
    return null;
  }
}
//************************************************
// Uses password to encrypt private key privKey
export async function encryptPrivateKey(privKey, password) {
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
//************************************************
// Decrypts a private key, encryptedData, that was encrypted using 
// encryptPrivateKey and password
export async function decryptPrivateKey(encryptedData, password) {
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
//************************************************
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}
