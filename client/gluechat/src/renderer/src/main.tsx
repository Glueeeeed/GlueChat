import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'

import {Login} from "@renderer/views/Login";
import {Register} from "@renderer/views/Register";
import {App} from "@renderer/views/App";
import {SelectAccount} from "@renderer/views/SelectAccount";

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/select-account',
    element: <SelectAccount />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
