import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import BackupReminder from "./components/BackupReminder";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import AddEditTrade from "./pages/AddEditTrade";
import AnalyticsPage from "./pages/AnalyticsPage";
import RulesChecklist from "./pages/RulesChecklist";
import News from "./pages/News";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Journal from "./pages/Journal";
import OpenTrades from "./pages/OpenTrades";
import { useAuth } from "./lib/authStore";

function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
          <BackupReminder />
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<TradeLog />} />
            <Route path="/open" element={<OpenTrades />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/add" element={<AddEditTrade />} />
            <Route path="/edit/:id" element={<AddEditTrade />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/checklist" element={<RulesChecklist />} />
            <Route path="/news" element={<News />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
