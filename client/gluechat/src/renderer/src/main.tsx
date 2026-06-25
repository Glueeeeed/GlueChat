import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'


import {Login} from "@renderer/views/Login";
import {Register} from "@renderer/views/Register";
import {App} from "@renderer/views/App";
import {SelectAccount} from "@renderer/views/SelectAccount";
import { AccountRecovery } from '@renderer/views/AccountRecovery'

const queryClient = new QueryClient()


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
  {
    path: '/recovery',
    element: <AccountRecovery />
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
