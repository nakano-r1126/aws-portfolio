import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAMES } from "./client";

// トレンドの型定義
export interface Trend {
  id: string;
  name: string;
  category: string;
  description: string;
  popularity: number;
  growth: number;
  createdAt: string;
  updatedAt: string;
}

// トレンド作成用の入力型
export interface CreateTrendInput {
  name: string;
  category: string;
  description: string;
  popularity: number;
  growth: number;
}

// トレンド更新用の入力型
export interface UpdateTrendInput {
  name?: string;
  category?: string;
  description?: string;
  popularity?: number;
  growth?: number;
}

// 全トレンド取得
export const getAllTrends = async (limit?: number): Promise<Trend[]> => {
  const command = new ScanCommand({
    TableName: TABLE_NAMES.TRENDS,
    Limit: limit,
  });

  const result = await docClient.send(command);
  return (result.Items as Trend[]) || [];
};

// カテゴリでトレンド取得
export const getTrendsByCategory = async (category: string): Promise<Trend[]> => {
  const command = new QueryCommand({
    TableName: TABLE_NAMES.TRENDS,
    IndexName: "category-index",
    KeyConditionExpression: "category = :category",
    ExpressionAttributeValues: {
      ":category": category,
    },
  });

  const result = await docClient.send(command);
  return (result.Items as Trend[]) || [];
};

// ID でトレンド取得
export const getTrendById = async (id: string): Promise<Trend | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAMES.TRENDS,
    Key: { id },
  });

  const result = await docClient.send(command);
  return (result.Item as Trend) || null;
};

// トレンド作成
export const createTrend = async (input: CreateTrendInput): Promise<Trend> => {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const trend: Trend = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  const command = new PutCommand({
    TableName: TABLE_NAMES.TRENDS,
    Item: trend,
  });

  await docClient.send(command);
  return trend;
};

// トレンド更新
export const updateTrend = async (
  id: string,
  input: UpdateTrendInput
): Promise<Trend | null> => {
  // まず存在確認
  const existing = await getTrendById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  // 更新する属性を動的に構築
  const updateExpressions: string[] = ["updatedAt = :updatedAt"];
  const expressionAttributeValues: Record<string, unknown> = {
    ":updatedAt": now,
  };

  if (input.name !== undefined) {
    updateExpressions.push("#name = :name");
    expressionAttributeValues[":name"] = input.name;
  }
  if (input.category !== undefined) {
    updateExpressions.push("category = :category");
    expressionAttributeValues[":category"] = input.category;
  }
  if (input.description !== undefined) {
    updateExpressions.push("description = :description");
    expressionAttributeValues[":description"] = input.description;
  }
  if (input.popularity !== undefined) {
    updateExpressions.push("popularity = :popularity");
    expressionAttributeValues[":popularity"] = input.popularity;
  }
  if (input.growth !== undefined) {
    updateExpressions.push("growth = :growth");
    expressionAttributeValues[":growth"] = input.growth;
  }

  const command = new UpdateCommand({
    TableName: TABLE_NAMES.TRENDS,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
    // "name" は予約語なので ExpressionAttributeNames が必要
    ExpressionAttributeNames: input.name !== undefined ? { "#name": "name" } : undefined,
    ReturnValues: "ALL_NEW",
  });

  const result = await docClient.send(command);
  return result.Attributes as Trend;
};

// トレンド削除
export const deleteTrend = async (id: string): Promise<boolean> => {
  const command = new DeleteCommand({
    TableName: TABLE_NAMES.TRENDS,
    Key: { id },
  });

  await docClient.send(command);
  return true;
};

// カテゴリ一覧取得
export const getCategories = async (): Promise<string[]> => {
  const trends = await getAllTrends();
  const categories = [...new Set(trends.map((t) => t.category))];
  return categories.sort();
};
