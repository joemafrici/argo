import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Home from './Home'
import Login from './components/Login'
import NotFoundPage from './NotFoundPage.tsx'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'home',
        element: <Home />,
        children: [
          {
            path: ':conversationId',
            //element: <Conversation />,
          },
        ],
      },
      {
        path: '/',
        element: <Navigate to='/home' replace />
      },
    ],
  },
]);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
