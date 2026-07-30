import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import TradeLog from "./pages/TradeLog";
import AddTrade from "./pages/AddTrade";
import RulesChecklist from "./pages/RulesChecklist";
import BacktestProgress from "./pages/BacktestProgress";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="flex min-h-screen">
          <Navbar />
          <main className="flex-1 overflow-auto pt-14 lg:pt-0">
            <div className="mx-auto max-w-7xl p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/log" element={<TradeLog />} />
                <Route path="/add" element={<AddTrade />} />
                <Route path="/checklist" element={<RulesChecklist />} />
                <Route path="/backtest" element={<BacktestProgress />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
