"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { configureAmplify } from "@/lib/amplify-config";

// Amplify初期化状態のコンテキスト
const AuthReadyContext = createContext(false);

export const useAuthReady = () => useContext(AuthReadyContext);

// Amplifyの初期化を行うプロバイダー
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    configureAmplify();
    setIsReady(true);
  }, []);

  // Amplify初期化前はローディング表示
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthReadyContext.Provider value={isReady}>
      {children}
    </AuthReadyContext.Provider>
  );
}
