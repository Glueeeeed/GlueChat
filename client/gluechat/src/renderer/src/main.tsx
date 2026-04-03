import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'

import {Login} from "@renderer/views/Login";
import {Register} from "@renderer/views/Register";

const router = createHashRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
