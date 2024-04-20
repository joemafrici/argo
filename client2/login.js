// Login form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  // TODO: Send login request to the server
  console.log('Login:', username, password);
  fetch('http://localhost:3001/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);
        window.location.href = 'chat.html';
      } else {
        console.error('Login failed');
      }
    })
    .catch(error => {
      console.error('Error during login:', error);
    });
});

// Register form submission
document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newPassword').value;
  // TODO: Send registration request to the server
  console.log('Register:', username, password);
});
