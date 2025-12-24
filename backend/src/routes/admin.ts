import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { success, badRequest, notFound, serverError } from "../utils/response";
import * as trendsDb from "../db/trends";

// トレンド作成
export const createTrend = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  let body: {
    name?: string;
    category?: string;
    description?: string;
    popularity?: number;
    growth?: number;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  // バリデーション
  const { name, category, description, popularity, growth } = body;

  if (!name || !category || !description) {
    return badRequest("name, category, and description are required");
  }

  if (popularity !== undefined && (popularity < 0 || popularity > 100)) {
    return badRequest("popularity must be between 0 and 100");
  }

  try {
    const trend = await trendsDb.createTrend({
      name,
      category,
      description,
      popularity: popularity ?? 50,
      growth: growth ?? 0,
    });

    return success({ trend, message: "Trend created" }, 201);
  } catch (error) {
    console.error("Error creating trend:", error);
    return serverError("Failed to create trend");
  }
};

// トレンド更新
export const updateTrend = async (
  event: APIGatewayProxyEventV2,
  id: string
): Promise<APIGatewayProxyResultV2> => {
  let body: {
    name?: string;
    category?: string;
    description?: string;
    popularity?: number;
    growth?: number;
  };

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  // バリデーション
  if (body.popularity !== undefined && (body.popularity < 0 || body.popularity > 100)) {
    return badRequest("popularity must be between 0 and 100");
  }

  try {
    const trend = await trendsDb.updateTrend(id, body);

    if (!trend) {
      return notFound("Trend not found");
    }

    return success({ trend, message: "Trend updated" });
  } catch (error) {
    console.error("Error updating trend:", error);
    return serverError("Failed to update trend");
  }
};

// トレンド削除
export const deleteTrend = async (id: string): Promise<APIGatewayProxyResultV2> => {
  try {
    // 存在確認
    const existing = await trendsDb.getTrendById(id);
    if (!existing) {
      return notFound("Trend not found");
    }

    await trendsDb.deleteTrend(id);

    return success({ message: "Trend deleted", id });
  } catch (error) {
    console.error("Error deleting trend:", error);
    return serverError("Failed to delete trend");
  }
};
