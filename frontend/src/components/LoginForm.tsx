"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } from "aws-amplify/auth";

type AuthMode = "login" | "signup" | "confirm" | "forgotPassword" | "resetPassword";

// 背景の泡のデータ（固定値でSSRエラー回避）
const bubbles = [
  { width: 80, height: 120, left: 10, top: 20, duration: 3, delay: 0 },
  { width: 100, height: 80, left: 85, top: 60, duration: 4, delay: 0.5 },
  { width: 60, height: 90, left: 30, top: 70, duration: 3.5, delay: 1 },
  { width: 140, height: 100, left: 60, top: 10, duration: 4.5, delay: 0.3 },
  { width: 70, height: 70, left: 45, top: 85, duration: 3.2, delay: 1.5 },
  { width: 90, height: 130, left: 75, top: 35, duration: 4.2, delay: 0.8 },
  { width: 110, height: 60, left: 15, top: 50, duration: 3.8, delay: 1.2 },
  { width: 85, height: 85, left: 55, top: 45, duration: 4, delay: 0.2 },
  { width: 95, height: 110, left: 5, top: 80, duration: 3.3, delay: 1.8 },
  { width: 75, height: 95, left: 90, top: 15, duration: 4.3, delay: 0.6 },
  { width: 65, height: 75, left: 25, top: 40, duration: 3.6, delay: 0.4 },
  { width: 120, height: 90, left: 70, top: 75, duration: 4.1, delay: 1.1 },
  { width: 55, height: 115, left: 40, top: 5, duration: 3.4, delay: 1.6 },
  { width: 105, height: 65, left: 95, top: 50, duration: 4.4, delay: 0.7 },
  { width: 88, height: 105, left: 50, top: 90, duration: 3.7, delay: 1.3 },
];

interface LoginFormProps {
  onAuthSuccess: () => void;
}

export function LoginForm({ onAuthSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // パスワード生成
  const generatePassword = () => {
    const length = 16;
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    const allChars = lowercase + uppercase + numbers + symbols;

    // 各カテゴリから最低1文字を確保
    let result =
      lowercase[Math.floor(Math.random() * lowercase.length)] +
      uppercase[Math.floor(Math.random() * uppercase.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      symbols[Math.floor(Math.random() * symbols.length)];

    // 残りをランダムに埋める
    for (let i = result.length; i < length; i++) {
      result += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // シャッフル
    result = result.split("").sort(() => Math.random() - 0.5).join("");
    return result;
  };

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn({ username: email, password });
      onAuthSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // サインアップ処理
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email },
        },
      });
      setMode("confirm");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 確認コード検証
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: confirmCode });
      await signIn({ username: email, password });
      onAuthSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "確認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセット要求
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword({ username: email });
      setMode("resetPassword");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "リセットメールの送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 新しいパスワードの設定
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: confirmCode,
        newPassword,
      });
      // リセット成功後、ログイン
      await signIn({ username: email, password: newPassword });
      onAuthSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "パスワードのリセットに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // アニメーション設定
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
    exit: { opacity: 0, y: -20 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      {/* 背景のアニメーション */}
      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map((bubble, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: bubble.width,
              height: bubble.height,
              left: `${bubble.left}%`,
              top: `${bubble.top}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: bubble.duration,
              repeat: Infinity,
              delay: bubble.delay,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4"
        >
          {/* ロゴ/タイトル */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <span className="text-2xl">📊</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-800">
              {mode === "login" && "ログイン"}
              {mode === "signup" && "新規登録"}
              {mode === "confirm" && "メール確認"}
              {mode === "forgotPassword" && "パスワード再設定"}
              {mode === "resetPassword" && "新しいパスワード"}
            </h1>
            <p className="text-gray-500 mt-2">技術トレンドダッシュボード</p>
          </motion.div>

          {/* エラー表示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ログインフォーム */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <motion.div variants={itemVariants} className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                  placeholder="email@example.com"
                  required
                />
              </motion.div>
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgotPassword");
                    setError("");
                  }}
                  className="text-sm text-purple-500 hover:text-purple-700 mt-2 transition-colors"
                >
                  パスワードを忘れた場合
                </button>
              </motion.div>
              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block"
                  >
                    ⏳
                  </motion.span>
                ) : (
                  "ログイン"
                )}
              </motion.button>
            </form>
          )}

          {/* パスワードリセット要求フォーム */}
          {mode === "forgotPassword" && (
            <form onSubmit={handleForgotPassword}>
              <motion.p variants={itemVariants} className="text-gray-600 mb-4 text-center">
                登録したメールアドレスを入力してください。<br />
                パスワードリセット用のコードを送信します。
              </motion.p>
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                  placeholder="email@example.com"
                  required
                />
              </motion.div>
              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "送信中..." : "リセットコードを送信"}
              </motion.button>
            </form>
          )}

          {/* 新しいパスワード設定フォーム */}
          {mode === "resetPassword" && (
            <form onSubmit={handleResetPassword}>
              <motion.p variants={itemVariants} className="text-gray-600 mb-4 text-center">
                📧 <span className="font-medium">{email}</span> にリセットコードを送信しました
              </motion.p>
              <motion.div variants={itemVariants} className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  確認コード
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest text-gray-800"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </motion.div>
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    8文字以上、大文字・小文字・数字を含む
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newPwd = generatePassword();
                      setNewPassword(newPwd);
                      setShowNewPassword(true);
                    }}
                    className="text-xs text-purple-500 hover:text-purple-700 transition-colors"
                  >
                    🔐 自動生成
                  </button>
                </div>
              </motion.div>
              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "設定中..." : "パスワードを変更してログイン"}
              </motion.button>
            </form>
          )}

          {/* サインアップフォーム */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp}>
              <motion.div variants={itemVariants} className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                  placeholder="email@example.com"
                  required
                />
              </motion.div>
              <motion.div variants={itemVariants} className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-800"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    8文字以上、大文字・小文字・数字を含む
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newPwd = generatePassword();
                      setPassword(newPwd);
                      setShowPassword(true);
                    }}
                    className="text-xs text-purple-500 hover:text-purple-700 transition-colors"
                  >
                    🔐 自動生成
                  </button>
                </div>
              </motion.div>
              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "登録中..." : "アカウント作成"}
              </motion.button>
            </form>
          )}

          {/* 確認コードフォーム */}
          {mode === "confirm" && (
            <form onSubmit={handleConfirm}>
              <motion.p variants={itemVariants} className="text-gray-600 mb-4 text-center">
                📧 <span className="font-medium">{email}</span> に確認コードを送信しました
              </motion.p>
              <motion.div variants={itemVariants} className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  確認コード
                </label>
                <input
                  type="text"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest text-gray-800"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </motion.div>
              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "確認中..." : "確認して登録完了"}
              </motion.button>
            </form>
          )}

          {/* モード切り替え */}
          <motion.div variants={itemVariants} className="mt-6 text-center space-y-2">
            {mode === "login" ? (
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="text-purple-500 hover:text-purple-700 font-medium transition-colors"
              >
                アカウントを作成 →
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setConfirmCode("");
                  setNewPassword("");
                }}
                className="text-purple-500 hover:text-purple-700 font-medium transition-colors"
              >
                ← ログインに戻る
              </button>
            )}
            <div>
              <a
                href="/"
                className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                トップページへ戻る
              </a>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
