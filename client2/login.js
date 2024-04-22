import * as encrypt from './encrypt.js';
// Login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      // TODO: use this line after retrieving key from localstorage
      //const publicKey = await encrypt.createPublicCryptoKey(data.keys.public);
      // TODO: get the salt from the response
      // TODO: generate and send salt upon register
      // TODO: get server to accept salt and store in register handler
      // TODO: get server to send salt on login handler
      const derivedKey = encrypt.generateDerivedKey(password, salt);
      // TODO: derived key may need to be in some storable form
      localStorage.setItem('derivedKey', derivedKey);
      localStorage.setItem('publicKey', data.keys.public);
      localStorage.setItem('privateKey', data.keys.encryptedPrivate);
      
      window.location.href = 'chat.html';
    } else {
      console.error('Login failed');
    }
  } catch (error) {
    console.error('error handling login', error);
  }
});

// Register form submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newPassword').value;
  try {
    const keyPair = await encrypt.generateKeyPair(); 
    if (keyPair) {
      const encryptedPrivateKey = await encrypt.encryptPrivateKey(keyPair.privateKey, password);
      const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKey = encrypt.arrayBufferToBase64(publicKeyArrayBuffer);
      fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey: encryptedPrivateKey }),
        });
    } else {
      throw new Error('keyPair not valid');
    }
  } catch (error) {
    console.error('Failed to generate public/private key pair:', error);
  }
});
