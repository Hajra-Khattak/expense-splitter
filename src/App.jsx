import "./App.css";
import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

import Login from "./pages/Authentication/Login";
import Signup from "./pages/Authentication/Signup";
import ForgotPassword from "./pages/Authentication/ForgotPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import CreateGroup from "./pages/Groups/CreateGroup";
import GroupPage from "./pages/Groups/GroupPage";
import JoinGroup from "./pages/Groups/JoinGroup";
import Friends from "./pages/Friends/Friends";
import AddFriend from "./pages/Friends/AddFriend";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppLayout from "./components/AppLayout";
import MembersTab from "./components/Group/MembersTab";
import TabPlaceholder from "./pages/TabPlaceholder";
import { useTheme } from "./hooks/useTheme";

// Group tabs that are still empty placeholders
const PLACEHOLDER_TABS = [
  ["balances", "Balances"],
  ["settle-up", "Settle Up"],
  ["activity", "Activity"],
  ["stats", "Stats"],
];

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
            <Route path="friends" element={<Friends />} />
            <Route path="groups/new" element={<CreateGroup />} />

            <Route path="groups/:groupId" element={<GroupPage />}>
              <Route index element={<Navigate to="expenses" replace />} />
              <Route path="expenses" element={<TabPlaceholder title="Expenses" />} />
              <Route path="members" element={<MembersTab />} />
              {PLACEHOLDER_TABS.map(([path, title]) => (
                <Route key={path} path={path} element={<TabPlaceholder title={title} />} />
              ))}
            </Route>
          </Route>

          {/* Outside /app: a full-page card without the sidebar. Still protected. */}
          <Route path="/join/:code" element={<JoinGroup />} />
          <Route path="/add-friend/:uid" element={<AddFriend />} />
        </Route>

        {/* Temporary until the Landing page exists */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* later: <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </>
  );
}

export default App;