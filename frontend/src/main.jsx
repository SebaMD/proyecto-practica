import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Root from '@pages/Root'
import Error404 from '@pages/Error404'
import Login from '@pages/Login'
import Home from '@pages/Home'
import Appointments from '@pages/Appointments'
import ProtectedRoute from '@components/ProtectedRoute'
import '@styles/styles.css';
import Logout from '@pages/Logout'
import Users from '@pages/Users'
import Requests from '@pages/Requests'
import Petitions from '@pages/Petitions'
import Periods from '@pages/Period'
import Profile from '@pages/Profile'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <Error404 />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/auth",
        element: <Login />
      },
      {
        path: "/logout",
        element: <Logout />
      },
      {
        path: "/home",
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        )
      },
      {
        path: "/requests",
        element: (
          <ProtectedRoute allowedRoles={["funcionario", "ciudadano"]}>
            <Requests />
          </ProtectedRoute>
        )
      },
      {
        path: "/periods",
        element: (
          <ProtectedRoute allowedRoles={["funcionario", "administrador"]}>
            <Periods />
          </ProtectedRoute>
        )
      },
      {
        path: "/petitions",
        element: (
          <ProtectedRoute allowedRoles={["ciudadano", "funcionario", "supervisor"]}>
            <Petitions />
          </ProtectedRoute>
        )
      },
      {
        path: "/users",
        element: (
          <ProtectedRoute allowedRoles={["administrador"]}>
            <Users />
          </ProtectedRoute>
        )
      },
      {
        path: "/Appointments",
        element: (
          <ProtectedRoute allowedRoles={["ciudadano", "supervisor", "funcionario"]}>
            <Appointments />
          </ProtectedRoute>
        )
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )
      }
    ]
  }
])

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
)
