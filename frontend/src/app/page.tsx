"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      {/* 背景アニメーション */}
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

      {/* メインコンテンツ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* ロゴ */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-8"
        >
          <span className="text-5xl">📊</span>
        </motion.div>

        {/* タイトル */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold text-white text-center mb-4"
        >
          技術トレンド
          <br />
          ダッシュボード
        </motion.h1>

        {/* サブタイトル */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-white/80 text-lg text-center mb-12 max-w-md"
        >
          Qiita・Zennの技術記事トレンドを
          <br />
          リアルタイムで分析・可視化
        </motion.p>

        {/* ボタン */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              ログイン / 新規登録
            </motion.button>
          </Link>

          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/20 backdrop-blur text-white px-8 py-4 rounded-xl font-bold text-lg border-2 border-white/30 hover:bg-white/30 transition-all"
            >
              ゲストで見る
            </motion.button>
          </Link>
        </motion.div>

        {/* 機能紹介 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl"
        >
          {[
            { icon: "📈", title: "トレンド分析", desc: "人気タグや記事をリアルタイムで追跡" },
            { icon: "⭐", title: "お気に入り保存", desc: "気になる記事をブックマーク" },
            { icon: "🔔", title: "通知機能", desc: "注目の技術をいち早くキャッチ" },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-bold mb-1">{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
