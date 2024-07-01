// ***********************************************
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
// ***********************************************
export async function generateSymmetricKey() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    return key;
  } catch (err) {
    console.error('Failed to generate symmetric key:', err);
    throw new Error('Failed to generate symmetric key');
  }
}
// ***********************************************
export async function generateDerivedKey(password, salt) {
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
    true,
    ['encrypt', 'decrypt']
  );
  return derivedKey;
}
// ***********************************************
export async function encryptPrivateKey(privKey, derivedKey) {
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
// ***********************************************
export async function decryptPrivateKey(encryptedData, derivedKey) {
  const dataBuffer = base64ToArrayBuffer(encryptedData);
  if (!dataBuffer) {
    throw new Error('Failed to convert encrypted data to ArrayBuffer');
  }
  const iv = dataBuffer.slice(0, 12);
  const encryptedKeyBuffer = dataBuffer.slice(12);
  // TODO: need to convert this to a cryptokey
  //window.crypto.subtle.importKey('pkcs8', encryptedKeyBuffer);
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
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  ).catch(err => {
    throw new Error('Failed to import private key: ' + err);
  });

  return privateKey;
}
// ***********************************************
export async function encryptMessage(message, symmetricKey) {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);

    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      symmetricKey,
      encodedMessage
    );

    const encryptedArray = new Uint8Array(iv.length + encryptedData.byteLength);
    encryptedArray.set(iv, 0);
    encryptedArray.set(new Uint8Array(encryptedData), iv.length);

    return arrayBufferToBase64(encryptedArray.buffer);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}
// ***********************************************
export async function decryptMessage(encryptedMessage, symmetricKey) {
  try {
    const encryptedData = base64ToArrayBuffer(encryptedMessage);
    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      symmetricKey,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}
// ***********************************************
// Purpose: Sends user's keys to server for storage
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
// ***********************************************
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
// ***********************************************
export function saltArrayBufferToBase64(buffer) {
  try {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode.apply(null, bytes);
    return window.btoa(binary);
  } catch (err) {
    throw new Error('Failed to convert ArrayBuffer to base64: ' + err);
  }
}
// ***********************************************
export function saltBase64ToArrayBuffer(base64) {
  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let ii = 0; ii < binary.length; ++ii) {
      bytes[ii] = binary.charCodeAt(ii);
    }
    return bytes.buffer;
  } catch (err) {
    throw new Error('Failed to convert base64 to ArrayBuffer: ' + err);
  }
}
//************************************************
// Transforms keyData into CryptoKey object for use in Web Cryptogrophy API
export async function createPublicCryptoKey(keyData) {
  try {
    const keyBuffer = base64ToArrayBuffer(keyData);
    if (!keyBuffer) {
      throw new Error("Failed to convert key data to ArrayBuffer");
    }

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
  } catch (err) {
    console.error('Failed to import public key:', err);
    throw new Error('Failed to create public crypto key');
  }
}
//************************************************
export async function encryptSymmetricKey(symmetricKey, publicKey) {
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
//************************************************
export async function decryptSymmetricKey(encryptedSymmetricKey, privateKey) {
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
//************************************************
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(16));
}
// ***********************************************
// Storing the CryptoKey object
export async function storeDerivedKey(derivedKey) {
  const jwk = await window.crypto.subtle.exportKey('jwk', derivedKey);
  const jwkString = JSON.stringify(jwk);
  localStorage.setItem('derivedKey', jwkString);
}

// ***********************************************
// Retrieving the CryptoKey object
export async function retrieveDerivedKey() {
  const jwkString = localStorage.getItem('derivedKey');
  if (jwkString) {
    const jwk = JSON.parse(jwkString);
    const derivedKey = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    return derivedKey;
  }
  return null;
}
