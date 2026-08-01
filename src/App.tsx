import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import AddEditTrade from "./pages/AddEditTrade";
import RulesChecklist from "./pages/RulesChecklist";
import BacktestProgress from "./pages/BacktestProgress";
import Login from "./pages/Login";
import { useAuth } from "./lib/authStore";

function Layout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="flex min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
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
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<TradeLog />} />
            <Route path="/add" element={<AddEditTrade />} />
            <Route path="/edit/:id" element={<AddEditTrade />} />
            <Route path="/checklist" element={<RulesChecklist />} />
            <Route path="/backtest" element={<BacktestProgress />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
