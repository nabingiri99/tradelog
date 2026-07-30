import { useParams } from "react-router-dom";
import TradeForm from "../components/TradeForm";
import { getTrade } from "../lib/storage";

export default function AddEditTrade() {
  const { id } = useParams<{ id: string }>();
  const initialTrade = id ? getTrade(id) : undefined;

  if (id && !initialTrade) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Edit Trade</h1>
        <p className="mt-2 text-slate-400">Trade not found.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-100">
        {initialTrade ? "Edit Trade" : "Add Trade"}
      </h1>
      <p className="mt-2 mb-6 text-slate-400">
        {initialTrade
          ? "Update the details of this trade."
          : "Log a new trade with entry, stop loss and target."}
      </p>
      <TradeForm initialTrade={initialTrade} onSubmitSuccess={() => {}} />
    </div>
  );
}
