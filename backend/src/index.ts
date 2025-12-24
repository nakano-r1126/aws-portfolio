import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { verifyAuth, requireAuth, requireAdmin, AuthUser } from "./middleware/auth";
import { success, unauthorized, forbidden, notFound, methodNotAllowed } from "./utils/response";
import * as publicRoutes from "./routes/public";
import * as userRoutes from "./routes/user";

// メインハンドラー
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { rawPath, requestContext } = event;
  const method = requestContext.http.method;

  // OPTIONSリクエスト（CORS対応）
  if (method === "OPTIONS") {
    return success({});
  }

  // ヘルスチェック
  if (rawPath === "/health" && method === "GET") {
    return success({ status: "ok", timestamp: new Date().toISOString() });
  }

  // 認証チェック
  const auth = await verifyAuth(event);

  // ==================
  // 公開エンドポイント
  // ==================

  // トレンド一覧取得
  if (rawPath === "/api/trends" && method === "GET") {
    return publicRoutes.getTrends(event);
  }

  // トレンド詳細取得
  const trendMatch = rawPath.match(/^\/api\/trends\/([a-zA-Z0-9-]+)$/);
  if (trendMatch && method === "GET") {
    return publicRoutes.getTrendById(event, trendMatch[1]);
  }

  // カテゴリ一覧取得
  if (rawPath === "/api/categories" && method === "GET") {
    return publicRoutes.getCategories();
  }

  // ==================
  // 認証必須エンドポイント
  // ==================

  // 認証チェック
  if (!requireAuth(auth)) {
    return unauthorized(auth.error || "Authentication required");
  }

  const user = auth.user as AuthUser;

  // ユーザープロフィール取得
  if (rawPath === "/api/user/profile" && method === "GET") {
    return userRoutes.getProfile(user);
  }

  // お気に入り一覧取得
  if (rawPath === "/api/user/favorites" && method === "GET") {
    return userRoutes.getFavorites(user);
  }

  // お気に入り追加
  if (rawPath === "/api/user/favorites" && method === "POST") {
    return userRoutes.addFavorite(event, user);
  }

  // お気に入り削除
  const favoriteMatch = rawPath.match(/^\/api\/user\/favorites\/([a-zA-Z0-9-]+)$/);
  if (favoriteMatch && method === "DELETE") {
    return userRoutes.removeFavorite(user, favoriteMatch[1]);
  }

  // ユーザー設定取得
  if (rawPath === "/api/user/settings" && method === "GET") {
    return userRoutes.getSettings(user);
  }

  // ユーザー設定更新
  if (rawPath === "/api/user/settings" && method === "PUT") {
    return userRoutes.updateSettings(event, user);
  }

  // アイコンアップロードURL取得
  if (rawPath === "/api/user/upload-url" && method === "POST") {
    return userRoutes.getUploadUrl(event, user);
  }

  // ==================
  // 管理者専用エンドポイント
  // ==================

  if (rawPath.startsWith("/api/admin")) {
    if (!requireAdmin(auth)) {
      return forbidden("Admin access required");
    }

    // 管理者用トレンド作成
    if (rawPath === "/api/admin/trends" && method === "POST") {
      const { createTrend } = await import("./routes/admin");
      return createTrend(event);
    }

    // 管理者用トレンド更新
    const adminTrendMatch = rawPath.match(/^\/api\/admin\/trends\/([a-zA-Z0-9-]+)$/);
    if (adminTrendMatch && method === "PUT") {
      const { updateTrend } = await import("./routes/admin");
      return updateTrend(event, adminTrendMatch[1]);
    }

    // 管理者用トレンド削除
    if (adminTrendMatch && method === "DELETE") {
      const { deleteTrend } = await import("./routes/admin");
      return deleteTrend(adminTrendMatch[1]);
    }
  }

  // 404 Not Found
  return notFound(`Path not found: ${rawPath}`);
};
