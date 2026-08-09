import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, LineChart, MailCheck } from "lucide-react";
import { api } from "../lib/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? ""
      : "Missing verification token. Use the link from your verification email.",
  );
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    api.auth
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) {
          setStatus("success");
          setMessage("Your email has been verified. You can now sign in.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Email verification failed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend() {
    try {
      await api.auth.resendVerification();
      setResent(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not resend verification email.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          {status === "success" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : status === "error" ? (
            <XCircle className="h-6 w-6" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" />
          )}
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {status === "loading"
            ? "Verifying your email..."
            : status === "success"
              ? "Email verified"
              : "Verification failed"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>

        {status === "success" && (
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <LineChart className="h-4 w-4" />
            Sign In
          </Link>
        )}

        {status === "error" && token && !resent && (
          <button
            type="button"
            onClick={handleResend}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <MailCheck className="h-4 w-4" />
            Resend Verification Email
          </button>
        )}

        {status === "error" && !token && (
          <Link
            to="/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Back to Sign In
          </Link>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          Need help? Check the link in your inbox or try{" "}
          <Link
            to="/forgot-password"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            password reset
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
