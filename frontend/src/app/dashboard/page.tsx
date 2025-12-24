"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut, fetchAuthSession } from "aws-amplify/auth";
import { motion } from "framer-motion";
import * as api from "@/lib/api";

type UserRole = "guest" | "user" | "admin";

interface AuthUser {
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<api.Trend[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ユーザー認証チェック
  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();

        const groups = session.tokens?.idToken?.payload["cognito:groups"] as string[] | undefined;
        let role: UserRole = "user";

        if (groups?.includes("admin")) {
          role = "admin";
        } else if (groups?.includes("user")) {
          role = "user";
        }

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
          role,
        });

        if (favResult.data) {
          setFavorites(new Set(favResult.data.favorites.map(f => f.trendId)));
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  // トレンドとカテゴリを取得
  const fetchData = useCallback(async () => {
    setLoadingTrends(true);
    try {
      const [trendsResult, categoriesResult] = await Promise.all([
        api.getTrends(selectedCategory || undefined),
        api.getCategories(),
      ]);

      if (trendsResult.data) {
        setTrends(trendsResult.data.trends);
      }
      if (categoriesResult.data) {
        setCategories(categoriesResult.data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoadingTrends(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const toggleFavorite = async (trendId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (favorites.has(trendId)) {
      const result = await api.removeFavorite(trendId);
      if (!result.error) {
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(trendId);
          return next;
        });
      }
    } else {
      const result = await api.addFavorite(trendId);
      if (!result.error) {
        setFavorites(prev => new Set(prev).add(trendId));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 人気トップ5を計算
  const topTrends = [...trends]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);

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
            <h1 className="text-xl font-bold text-gray-800">技術トレンドダッシュボード</h1>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-lg">
                        {(user.displayName?.[0] || user.email[0]).toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>

                {/* ドロップダウンメニュー */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
                    >
                      {/* ユーザー情報 */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-xl">
                                {(user.displayName?.[0] || user.email[0]).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {user.displayName || "名前未設定"}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                              user.role === "admin"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {user.role === "admin" ? "管理者" : "ユーザー"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* メニュー項目 */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push("/favorites");
                          }}
                          className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <span>❤️</span>
                          <span>お気に入り</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            router.push("/settings");
                          }}
                          className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                          <span>⚙️</span>
                          <span>プロフィール設定</span>
                        </button>
                      </div>

                      {/* ログアウト */}
                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleSignOut();
                          }}
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                          <span>🚪</span>
                          <span>ログアウト</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
              >
                ログイン
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ゲストバナー（ローディング完了後かつ未ログインの場合のみ表示） */}
        {!loading && !user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between"
          >
            <p className="text-gray-700">
              ゲストモードで閲覧中です。ログインするとお気に入り保存などの機能が使えます。
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ログイン
            </motion.button>
          </motion.div>
        )}

        {/* 統計カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {[
            { label: "トレンド総数", value: trends.length.toString(), icon: "📈", color: "from-blue-400 to-blue-600" },
            { label: "カテゴリ数", value: categories.length.toString(), icon: "🏷️", color: "from-purple-400 to-purple-600" },
            { label: "お気に入り", value: favorites.size.toString(), icon: "⭐", color: "from-pink-400 to-pink-600" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                  <span className="text-xl">{stat.icon}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* カテゴリフィルター */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === ""
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              すべて
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 人気トレンドランキング */}
        {topTrends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl shadow-sm mb-8"
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📊</span> 人気トレンドランキング
            </h2>
            <div className="space-y-4">
              {topTrends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 font-medium">
                      {index + 1}. {trend.name}
                    </span>
                    <span className="text-gray-500">{trend.popularity}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${trend.popularity}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* トレンド一覧 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-2xl shadow-sm mb-8"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🔥</span> トレンド一覧
            {loadingTrends && (
              <span className="ml-2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            )}
          </h2>

          {trends.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {loadingTrends ? "読み込み中..." : "トレンドデータがありません"}
            </p>
          ) : (
            <div className="space-y-4">
              {trends.map((trend, index) => (
                <motion.div
                  key={trend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-1">{trend.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{trend.description}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                          {trend.category}
                        </span>
                        <span className="text-gray-500">
                          人気度: {trend.popularity}%
                        </span>
                        <span className={`${trend.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {trend.growth >= 0 ? "↑" : "↓"} {Math.abs(trend.growth)}%
                        </span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleFavorite(trend.id)}
                      className={`text-2xl transition-colors ${
                        favorites.has(trend.id) ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                      }`}
                      title={favorites.has(trend.id) ? "お気に入りから削除" : "お気に入りに追加"}
                    >
                      {favorites.has(trend.id) ? "★" : "☆"}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 管理者メニュー */}
        {user?.role === "admin" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-2xl border border-red-200"
          >
            <h2 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
              <span>🔧</span> 管理者メニュー
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["トレンド追加", "データ更新", "システム設定"].map((item) => (
                <motion.button
                  key={item}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white p-4 rounded-xl text-red-700 font-medium hover:shadow-md transition-all"
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
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
