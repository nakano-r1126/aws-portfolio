import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AuthUser } from "../middleware/auth";
import { success, badRequest, notFound, serverError } from "../utils/response";
import * as favoritesDb from "../db/favorites";
import * as userSettingsDb from "../db/userSettings";
import * as trendsDb from "../db/trends";

const s3Client = new S3Client({});
const USER_ICONS_BUCKET = process.env.USER_ICONS_BUCKET || "user-icons-bucket";

// ユーザープロフィール取得
export const getProfile = async (user: AuthUser): Promise<APIGatewayProxyResultV2> => {
  return success({
    profile: {
      id: user.sub,
      email: user.email,
      role: user.role,
      groups: user.groups,
    },
  });
};

// お気に入り一覧取得（トレンド情報も含む）
export const getFavorites = async (user: AuthUser): Promise<APIGatewayProxyResultV2> => {
  try {
    const favorites = await favoritesDb.getFavoritesByUser(user.sub);

    // トレンド情報も取得して返す
    const favoritesWithTrends = await Promise.all(
      favorites.map(async (fav) => {
        const trend = await trendsDb.getTrendById(fav.trendId);
        return {
          ...fav,
          trend,
        };
      })
    );

    return success({
      favorites: favoritesWithTrends,
      total: favorites.length,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return serverError("Failed to fetch favorites");
  }
};

// お気に入り追加
export const addFavorite = async (
  event: APIGatewayProxyEventV2,
  user: AuthUser
): Promise<APIGatewayProxyResultV2> => {
  let body: { trendId?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { trendId } = body;
  if (!trendId) {
    return badRequest("trendId is required");
  }

  try {
    // トレンドが存在するか確認
    const trend = await trendsDb.getTrendById(trendId);
    if (!trend) {
      return notFound("Trend not found");
    }

    // 既に追加済みかチェック
    const existing = await favoritesDb.getFavorite(user.sub, trendId);
    if (existing) {
      return badRequest("Already in favorites");
    }

    const favorite = await favoritesDb.addFavorite(user.sub, trendId);

    return success(
      {
        message: "Added to favorites",
        favorite,
      },
      201
    );
  } catch (error) {
    console.error("Error adding favorite:", error);
    return serverError("Failed to add favorite");
  }
};

// お気に入り削除
export const removeFavorite = async (
  user: AuthUser,
  trendId: string
): Promise<APIGatewayProxyResultV2> => {
  try {
    // 存在確認
    const existing = await favoritesDb.getFavorite(user.sub, trendId);
    if (!existing) {
      return notFound("Favorite not found");
    }

    await favoritesDb.removeFavorite(user.sub, trendId);

    return success({
      message: "Removed from favorites",
      trendId,
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return serverError("Failed to remove favorite");
  }
};

// ユーザー設定取得
export const getSettings = async (user: AuthUser): Promise<APIGatewayProxyResultV2> => {
  try {
    const settings = await userSettingsDb.getUserSettings(user.sub);
    return success({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return serverError("Failed to fetch settings");
  }
};

// ユーザー設定更新
export const updateSettings = async (
  event: APIGatewayProxyEventV2,
  user: AuthUser
): Promise<APIGatewayProxyResultV2> => {
  let body: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    notifications?: boolean;
    theme?: "light" | "dark";
  };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  // バリデーション
  if (body.theme && !["light", "dark"].includes(body.theme)) {
    return badRequest("theme must be 'light' or 'dark'");
  }
  if (body.displayName && body.displayName.length > 50) {
    return badRequest("displayName must be 50 characters or less");
  }
  if (body.bio && body.bio.length > 200) {
    return badRequest("bio must be 200 characters or less");
  }

  try {
    const settings = await userSettingsDb.updateUserSettings(user.sub, {
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
      theme: body.theme,
      notifications: body.notifications,
    });

    return success({
      settings,
      message: "Settings updated",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return serverError("Failed to update settings");
  }
};

// アイコンアップロード用Presigned URL発行
export const getUploadUrl = async (
  event: APIGatewayProxyEventV2,
  user: AuthUser
): Promise<APIGatewayProxyResultV2> => {
  let body: { contentType?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("Invalid JSON body");
  }

  const contentType = body.contentType || "image/png";

  // 許可する画像形式
  const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowedTypes.includes(contentType)) {
    return badRequest("Invalid content type. Allowed: png, jpeg, gif, webp");
  }

  // ファイル拡張子を決定
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `avatars/${user.sub}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: USER_ICONS_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const avatarUrl = `https://${USER_ICONS_BUCKET}.s3.amazonaws.com/${key}`;

    return success({
      uploadUrl,
      avatarUrl,
      expiresIn: 300,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return serverError("Failed to generate upload URL");
  }
};
