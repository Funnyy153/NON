"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }
    if (password !== "20260111") {
      setError("รหัสผ่านไม่ถูกต้อง");
      return;
    }
    setError("");
    // Redirect to before page
    router.push("/pages/before");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      setError("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 font-sans px-4 sm:px-6 lg:px-8 py-8 sm:py-6 pb-16 sm:pb-6 relative">
      {/* People-party SVG at bottom right of background */}
      <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-0 opacity-60 sm:opacity-100">
        <Image
          src="/People-party.svg"
          alt="People party"
          width={150}
          height={120}
          className="object-contain w-20 h-16 sm:w-32 sm:h-24 md:w-40 md:h-32 lg:w-[150px] lg:h-[120px]"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-xl sm:rounded-2xl p-1 bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 shadow-2xl">
          <div className="rounded-xl sm:rounded-2xl p-8 sm:p-8 md:p-10 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 sm:-top-20 sm:-right-20 w-20 h-20 sm:w-40 sm:h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 sm:-bottom-20 sm:-left-20 w-20 h-20 sm:w-40 sm:h-40 bg-white/10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <div className="text-center mb-8 sm:mb-8">
                <div className="inline-block mb-4 sm:mb-4">
                  <Image
                    src="/nonmon.jpg"
                    alt="Logo"
                    width={200}
                    height={200}
                    className="mx-auto rounded-full w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-[200px] lg:h-[200px] object-cover"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-2 drop-shadow-lg">
                  เข้าสู่ระบบ
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-xs sm:text-sm font-semibold text-white mb-2"
                  >
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 border-2 border-white/30 rounded-lg sm:rounded-xl bg-white/90 backdrop-blur-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all duration-200 shadow-inner text-sm sm:text-base"
                      placeholder="กรุณากรอกรหัสผ่าน"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="text-black text-xs sm:text-sm mt-2">
                      {error}
                    </p>
                  )}
                </div>

                <div className="pt-4 sm:pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-900 text-white py-4 px-4 sm:py-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg shadow-lg hover:bg-blue-800 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-900/50"
                  >
                    เข้าสู่ระบบ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
