import { useState, useCallback } from 'react'

const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('token'));
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string>('');

  const handleLogin = useCallback((token: string) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true)
  }, []);
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  }, []);
  const handleRegisterSuccess = useCallback(() => {
   setRegisterSuccessMessage('Registration successful.. You can now log in to your account.'); 
  }, []);

    return { isLoggedIn, registerSuccessMessage, handleLogin, handleLogout, handleRegisterSuccess };
}
export default useAuth;
