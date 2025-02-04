import { useState } from "react";
import { chatConfig } from "@/config/chat-config";
import { Lock } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === chatConfig.loginConfig.password) {
      localStorage.setItem("isLoggedIn", "true");
      onLogin();
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#003D7D]">
      <div className="w-full max-w-md px-8">
        <div className="relative mb-12 text-center">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
              <Lock className="h-8 w-8 text-[#003D7D]" />
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-8 pb-8 pt-20 shadow-xl backdrop-blur-sm">
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-white">
              Barilla RMGPT
            </h2>
            <p className="text-sm text-gray-200">
              {chatConfig.loginConfig.message}
            </p>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <div className="group relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="peer w-full rounded-lg border border-white/20 bg-white/10 p-4 text-sm text-white placeholder-transparent outline-none transition-all duration-300 focus:border-white focus:ring-1 focus:ring-white"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label
                    htmlFor="password"
                    className="absolute -top-6 left-2 text-xs text-gray-300 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:left-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:-top-6 peer-focus:left-2 peer-focus:text-xs peer-focus:text-white"
                  >
                    Password
                  </label>
                </div>
              </div>

              {error && (
                <div className="text-center text-sm font-medium text-red-400">
                  {chatConfig.loginConfig.errorMessage}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-lg bg-white p-4 text-sm font-semibold text-[#003D7D] transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#003D7D]"
                >
                  <span className="relative z-10">Sign in</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
