import "./App.css";
import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

import Login from "./pages/Authentication/Login";
import Signup from "./pages/Authentication/Signup";
import ForgotPassword from "./pages/Authentication/ForgotPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppLayout from "./components/AppLayout";
import { useTheme } from "./hooks/useTheme";

function App() {
  const { theme } = useTheme();

  return (
    <>
      <Toaster
        position="top-right"
        theme={theme}
        icons={{
          success: <CheckCircle color="green" />,
          error: <XCircle color="red" />,
          info: <Info color="blue" />,
          warning: <AlertTriangle color="orange" />,
        }}
      />

      <Routes>
        {/* Only for logged-out people */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Only for logged-in people */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            {/* later: groups/:groupId, groups/:groupId/balances, ... */}
          </Route>
          {/* later: /join/:code */}
        </Route>

        {/* Temporary until the Landing page exists */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* later: <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </>
  );
}

export default App;