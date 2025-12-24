import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { success, notFound, serverError } from "../utils/response";
import * as trendsDb from "../db/trends";

// トレンド一覧取得
export const getTrends = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const category = event.queryStringParameters?.category;
    const limit = parseInt(event.queryStringParameters?.limit || "50", 10);

    let trends;

    if (category) {
      trends = await trendsDb.getTrendsByCategory(category);
    } else {
      trends = await trendsDb.getAllTrends(limit);
    }

    return success({
      trends,
      total: trends.length,
    });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return serverError("Failed to fetch trends");
  }
};

// トレンド詳細取得
export const getTrendById = async (
  _event: APIGatewayProxyEventV2,
  id: string
): Promise<APIGatewayProxyResultV2> => {
  try {
    const trend = await trendsDb.getTrendById(id);

    if (!trend) {
      return notFound("Trend not found");
    }

    return success({ trend });
  } catch (error) {
    console.error("Error fetching trend:", error);
    return serverError("Failed to fetch trend");
  }
};

// カテゴリ一覧取得
export const getCategories = async (): Promise<APIGatewayProxyResultV2> => {
  try {
    const categories = await trendsDb.getCategories();
    return success({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return serverError("Failed to fetch categories");
  }
};
