import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Activity from './pages/Activity'
import Login from './pages/Login'
import Tasks from './pages/Tasks'
import Today from './pages/Today'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Today />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="activity" element={<Activity />} />
      </Route>
    </Routes>
  )
}

export default App
