import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom';
import './App.css';

const App: React.FC = () => {
  const navigate = useNavigate();
  const handleLogoutClick = () => {
    navigate('/login');
  };
  return (
    <>
      <button className='logout-button' onClick={() => handleLogoutClick()}>Logout</button>
      <Outlet />
    </>
  )
}

export default App
