import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// DynamoDBクライアント設定
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-northeast-1",
});

// ドキュメントクライアント（JSONをそのまま扱える）
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// テーブル名（環境変数で切り替え可能）
export const TABLE_NAMES = {
  TRENDS: process.env.TRENDS_TABLE || "tech-trends",
  FAVORITES: process.env.FAVORITES_TABLE || "tech-trends-favorites",
  USER_SETTINGS: process.env.USER_SETTINGS_TABLE || "tech-trends-user-settings",
};
