"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { motion } from "framer-motion";
import * as api from "@/lib/api";

interface AuthUser {
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<api.Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // ユーザー認証チェック
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        await fetchAuthSession();

        const email = currentUser.signInDetails?.loginId || currentUser.username || "unknown";

        // お気に入りとユーザー設定を並行取得
        const [favResult, settingsResult] = await Promise.all([
          api.getFavorites(),
          api.getSettings(),
        ]);

        setUser({
          email,
          displayName: settingsResult.data?.settings?.displayName,
          avatarUrl: settingsResult.data?.settings?.avatarUrl,
        });

        if (favResult.data) {
          setFavorites(favResult.data.favorites);
        }
      } catch (error) {
        // UserUnAuthenticatedExceptionの場合のみログインページへリダイレクト
        const isAuthError = error instanceof Error &&
          (error.name === "UserUnAuthenticatedException" ||
           error.message.includes("User needs to be authenticated"));
        if (isAuthError) {
          router.push("/login");
          return;
        }
        // その他のエラーはログに出力してダッシュボードへ戻す
        console.error("Failed to load favorites:", error);
        router.push("/dashboard");
        return;
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const removeFavorite = async (trendId: string) => {
    setLoadingFavorites(true);
    const result = await api.removeFavorite(trendId);
    if (!result.error) {
      setFavorites(prev => prev.filter(f => f.trendId !== trendId));
    }
    setLoadingFavorites(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white shadow-sm sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10 }}
              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={() => router.push("/dashboard")}
            >
              <span className="text-lg">📊</span>
            </motion.div>
            <h1 className="text-xl font-bold text-gray-800">お気に入り</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-lg">
                      {(user.displayName?.[0] || user.email[0]).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -5 }}
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <span>←</span>
          <span>ダッシュボードに戻る</span>
        </motion.button>

        {/* 統計 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">お気に入り数</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{favorites.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">❤️</span>
            </div>
          </div>
        </motion.div>

        {/* お気に入り一覧 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>⭐</span> お気に入りトレンド
            {loadingFavorites && (
              <span className="ml-2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            )}
          </h2>

          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">お気に入りに登録したトレンドはありません</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard")}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg"
              >
                トレンドを探す
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.trendId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {favorite.trend ? (
                        <>
                          <h3 className="font-medium text-gray-800 mb-1">{favorite.trend.name}</h3>
                          <p className="text-gray-600 text-sm mb-2">{favorite.trend.description}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                              {favorite.trend.category}
                            </span>
                            <span className="text-gray-500">
                              人気度: {favorite.trend.popularity}%
                            </span>
                            <span className={`${favorite.trend.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {favorite.trend.growth >= 0 ? "↑" : "↓"} {Math.abs(favorite.trend.growth)}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">トレンド情報を取得できません</p>
                      )}
                      <p className="text-gray-400 text-xs mt-2">
                        追加日: {new Date(favorite.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFavorite(favorite.trendId)}
                      className="text-2xl text-yellow-500 hover:text-yellow-600 transition-colors"
                      title="お気に入りから削除"
                    >
                      ★
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          <p>技術トレンドダッシュボード © 2025</p>
        </div>
      </footer>
    </div>
  );
}
