"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { motion } from "framer-motion";
import * as api from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // フォームの状態
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifications, setNotifications] = useState(true);

  // ユーザー情報
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUserEmail(currentUser.signInDetails?.loginId || currentUser.username || "");

        const result = await api.getSettings();
        if (result.data?.settings) {
          const s = result.data.settings;
          setDisplayName(s.displayName || "");
          setBio(s.bio || "");
          setAvatarUrl(s.avatarUrl || "");
          setPreviewUrl(s.avatarUrl || "");
          setTheme(s.theme || "light");
          setNotifications(s.notifications ?? true);
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "ファイルサイズは5MB以下にしてください" });
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // アップロード
    setUploading(true);
    setMessage(null);

    const result = await api.uploadAvatar(file);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setPreviewUrl(avatarUrl); // 元に戻す
    } else if (result.avatarUrl) {
      setAvatarUrl(result.avatarUrl);
      setMessage({ type: "success", text: "アイコンをアップロードしました" });
    }

    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await api.updateSettings({
      displayName: displayName || undefined,
      avatarUrl: avatarUrl || undefined,
      bio: bio || undefined,
      theme,
      notifications,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "設定を保存しました" });
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">プロフィール設定</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-800"
            >
              ダッシュボードへ戻る
            </button>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* メッセージ表示 */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 ${
              message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* プロフィールカード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">プロフィール</h2>

          {/* アバター */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                    {displayName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {uploading ? "アップロード中..." : "画像を変更"}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, GIF, WebP (最大5MB)
              </p>
            </div>
          </div>

          {/* 表示名 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="ニックネームを入力"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
            />
            <p className="text-sm text-gray-500 mt-1">{displayName.length}/50</p>
          </div>

          {/* メールアドレス（表示のみ） */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          {/* 自己紹介 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自己紹介
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="自己紹介を入力..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-800"
            />
            <p className="text-sm text-gray-500 mt-1">{bio.length}/200</p>
          </div>
        </motion.div>

        {/* 設定カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">設定</h2>

          {/* テーマ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テーマ
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  theme === "light"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">☀️</span>
                <span className="ml-2 text-gray-800">ライト</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  theme === "dark"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">🌙</span>
                <span className="ml-2 text-gray-800">ダーク</span>
              </button>
            </div>
          </div>

          {/* 通知設定 */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">メール通知</span>
              <p className="text-sm text-gray-500">新しいトレンド情報をメールで受け取る</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </motion.div>

        {/* 保存ボタン */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? "保存中..." : "設定を保存"}
        </motion.button>
      </main>
    </div>
  );
}
