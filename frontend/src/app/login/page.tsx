"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        // 既にログイン済みならダッシュボードへ
        router.push("/dashboard/");
      } catch {
        // 未ログイン、ログインページを表示
        setChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleAuthSuccess = () => {
    // Next.jsのルーターでSPA遷移（認証状態を保持）
    router.push("/dashboard/");
  };

  // 認証チェック中はローディング表示
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return <LoginForm onAuthSuccess={handleAuthSuccess} />;
}
