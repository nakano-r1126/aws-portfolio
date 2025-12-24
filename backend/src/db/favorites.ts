import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAMES } from "./client";

// お気に入りの型定義
export interface Favorite {
  userId: string;
  trendId: string;
  createdAt: string;
}

// ユーザーのお気に入り一覧取得
export const getFavoritesByUser = async (userId: string): Promise<Favorite[]> => {
  const command = new QueryCommand({
    TableName: TABLE_NAMES.FAVORITES,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  });

  const result = await docClient.send(command);
  return (result.Items as Favorite[]) || [];
};

// 特定のお気に入りを取得
export const getFavorite = async (
  userId: string,
  trendId: string
): Promise<Favorite | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAMES.FAVORITES,
    Key: { userId, trendId },
  });

  const result = await docClient.send(command);
  return (result.Item as Favorite) || null;
};

// お気に入り追加
export const addFavorite = async (
  userId: string,
  trendId: string
): Promise<Favorite> => {
  const now = new Date().toISOString();

  const favorite: Favorite = {
    userId,
    trendId,
    createdAt: now,
  };

  const command = new PutCommand({
    TableName: TABLE_NAMES.FAVORITES,
    Item: favorite,
    // 既に存在する場合はエラー
    ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(trendId)",
  });

  await docClient.send(command);
  return favorite;
};

// お気に入り削除
export const removeFavorite = async (
  userId: string,
  trendId: string
): Promise<boolean> => {
  const command = new DeleteCommand({
    TableName: TABLE_NAMES.FAVORITES,
    Key: { userId, trendId },
  });

  await docClient.send(command);
  return true;
};

// お気に入り数を取得（トレンドごと）
export const getFavoriteCount = async (trendId: string): Promise<number> => {
  // 注意: これは全スキャンなので、大量データには向かない
  // 本番では別途カウンター管理が必要
  const command = new QueryCommand({
    TableName: TABLE_NAMES.FAVORITES,
    IndexName: "trendId-index", // GSI が必要
    KeyConditionExpression: "trendId = :trendId",
    ExpressionAttributeValues: {
      ":trendId": trendId,
    },
    Select: "COUNT",
  });

  try {
    const result = await docClient.send(command);
    return result.Count || 0;
  } catch {
    // GSI がない場合は 0 を返す
    return 0;
  }
};
