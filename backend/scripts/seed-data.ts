/**
 * サンプルデータ投入スクリプト
 * 実行: npx ts-node scripts/seed-data.ts
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// DynamoDBクライアント
const client = new DynamoDBClient({ region: "ap-northeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tech-trends";

// サンプルトレンドデータ
const sampleTrends = [
  // Frontend
  {
    id: crypto.randomUUID(),
    name: "React",
    category: "Frontend",
    description: "Metaが開発するUIライブラリ。コンポーネントベースで大規模アプリに最適。",
    popularity: 95,
    growth: 5,
  },
  {
    id: crypto.randomUUID(),
    name: "Next.js",
    category: "Frontend",
    description: "Reactベースのフルスタックフレームワーク。SSR/SSGに対応。",
    popularity: 88,
    growth: 15,
  },
  {
    id: crypto.randomUUID(),
    name: "Vue.js",
    category: "Frontend",
    description: "学習コストが低く、柔軟なJavaScriptフレームワーク。",
    popularity: 75,
    growth: 3,
  },
  {
    id: crypto.randomUUID(),
    name: "Svelte",
    category: "Frontend",
    description: "コンパイル時に最適化される新しいアプローチのフレームワーク。",
    popularity: 45,
    growth: 25,
  },
  {
    id: crypto.randomUUID(),
    name: "Tailwind CSS",
    category: "Frontend",
    description: "ユーティリティファーストのCSSフレームワーク。高速なスタイリングが可能。",
    popularity: 82,
    growth: 20,
  },

  // Backend
  {
    id: crypto.randomUUID(),
    name: "Node.js",
    category: "Backend",
    description: "JavaScriptでサーバーサイド開発ができるランタイム環境。",
    popularity: 90,
    growth: 2,
  },
  {
    id: crypto.randomUUID(),
    name: "Go",
    category: "Backend",
    description: "Googleが開発した高速でシンプルなプログラミング言語。",
    popularity: 70,
    growth: 12,
  },
  {
    id: crypto.randomUUID(),
    name: "Rust",
    category: "Backend",
    description: "メモリ安全性と高速性を両立した言語。システムプログラミングに最適。",
    popularity: 55,
    growth: 30,
  },
  {
    id: crypto.randomUUID(),
    name: "Python",
    category: "Backend",
    description: "シンプルな文法で人気。AI/ML分野で特に活用されている。",
    popularity: 92,
    growth: 8,
  },

  // Cloud
  {
    id: crypto.randomUUID(),
    name: "AWS",
    category: "Cloud",
    description: "世界最大のクラウドプラットフォーム。200以上のサービスを提供。",
    popularity: 85,
    growth: 5,
  },
  {
    id: crypto.randomUUID(),
    name: "Docker",
    category: "Cloud",
    description: "コンテナ技術のデファクトスタンダード。環境構築を効率化。",
    popularity: 88,
    growth: 3,
  },
  {
    id: crypto.randomUUID(),
    name: "Kubernetes",
    category: "Cloud",
    description: "コンテナオーケストレーションツール。大規模運用に必須。",
    popularity: 72,
    growth: 10,
  },
  {
    id: crypto.randomUUID(),
    name: "Terraform",
    category: "Cloud",
    description: "Infrastructure as Codeツール。マルチクラウド対応。",
    popularity: 65,
    growth: 15,
  },

  // AI/ML
  {
    id: crypto.randomUUID(),
    name: "ChatGPT/LLM",
    category: "AI/ML",
    description: "大規模言語モデル。テキスト生成、コード補完など幅広く活用。",
    popularity: 98,
    growth: 50,
  },
  {
    id: crypto.randomUUID(),
    name: "TensorFlow",
    category: "AI/ML",
    description: "Googleの機械学習フレームワーク。本番環境での実績豊富。",
    popularity: 75,
    growth: -5,
  },
  {
    id: crypto.randomUUID(),
    name: "PyTorch",
    category: "AI/ML",
    description: "研究者に人気の機械学習フレームワーク。動的計算グラフが特徴。",
    popularity: 80,
    growth: 10,
  },

  // Database
  {
    id: crypto.randomUUID(),
    name: "PostgreSQL",
    category: "Database",
    description: "高機能なオープンソースRDB。JSONサポートも充実。",
    popularity: 78,
    growth: 8,
  },
  {
    id: crypto.randomUUID(),
    name: "MongoDB",
    category: "Database",
    description: "ドキュメント指向NoSQLデータベース。柔軟なスキーマが特徴。",
    popularity: 65,
    growth: 5,
  },
  {
    id: crypto.randomUUID(),
    name: "Redis",
    category: "Database",
    description: "インメモリデータストア。キャッシュやセッション管理に最適。",
    popularity: 72,
    growth: 6,
  },

  // DevOps
  {
    id: crypto.randomUUID(),
    name: "GitHub Actions",
    category: "DevOps",
    description: "GitHubネイティブのCI/CDツール。ワークフロー自動化が簡単。",
    popularity: 80,
    growth: 18,
  },
  {
    id: crypto.randomUUID(),
    name: "ArgoCD",
    category: "DevOps",
    description: "Kubernetes向けGitOpsツール。宣言的なデプロイメント管理。",
    popularity: 55,
    growth: 25,
  },
];

async function seedData() {
  console.log("🚀 サンプルデータ投入開始...\n");

  const now = new Date().toISOString();

  for (const trend of sampleTrends) {
    const item = {
      ...trend,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );
      console.log(`✅ ${trend.name} (${trend.category})`);
    } catch (error) {
      console.error(`❌ ${trend.name}: ${error}`);
    }
  }

  console.log("\n✨ 完了！");
  console.log(`   投入件数: ${sampleTrends.length}`);
}

seedData();
