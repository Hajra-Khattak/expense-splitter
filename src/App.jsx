import "./App.css";
import { lazy, Suspense } from "react";
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
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppLayout from "./components/AppLayout";
import MembersTab from "./components/Group/MembersTab";
import SettingsTab from "./components/Group/SettingsTab";
import ExpensesTab from "./components/Expenses/ExpensesTab";
import { useTheme } from "./hooks/useTheme";


const BalancesTab = lazy(() => import("./components/Balances/BalancesTab"));
const SettleUpTab = lazy(() => import("./components/Balances/SettleUpTab"));
const ActivityTab = lazy(() => import("./components/Group/ActivityTab"));
const StatsTab = lazy(() => import("./components/Group/StatsTab"));
const PersonalExpenses = lazy(() => import("./pages/Personal/PersonalExpenses"));

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

      <Suspense
        fallback={
          <p className="p-6 text-sm text-gray-500 dark:text-green-300/60">Loading...</p>
        }
      >
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
              <Route path="personal" element={<PersonalExpenses />} />
              <Route path="groups/new" element={<CreateGroup />} />

              <Route path="groups/:groupId" element={<GroupPage />}>
                <Route index element={<Navigate to="expenses" replace />} />
                <Route path="expenses" element={<ExpensesTab />} />
                <Route path="balances" element={<BalancesTab />} />
                <Route path="settle-up" element={<SettleUpTab />} />
                <Route path="members" element={<MembersTab />} />
                <Route path="settings" element={<SettingsTab />} />
                <Route path="activity" element={<ActivityTab />} />
                <Route path="stats" element={<StatsTab />} />
              </Route>
            </Route>

            {/* Outside /app: a full-page card without the sidebar. Still protected. */}
            <Route path="/join/:code" element={<JoinGroup />} />
            <Route path="/add-friend/:uid" element={<AddFriend />} />
          </Route>

          {/* Temporary until the Landing page exists */}
          <Route path="/" element={<Navigate to="/app" replace />} />

         
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;