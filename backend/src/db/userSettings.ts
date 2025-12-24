import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAMES } from "./client";

// ユーザー設定の型定義
export interface UserSettings {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  theme: "light" | "dark";
  notifications: boolean;
  updatedAt: string;
}

// デフォルト設定
const DEFAULT_SETTINGS: Omit<UserSettings, "userId" | "updatedAt"> = {
  theme: "light",
  notifications: true,
};

// ユーザー設定取得
export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const command = new GetCommand({
    TableName: TABLE_NAMES.USER_SETTINGS,
    Key: { userId },
  });

  const result = await docClient.send(command);

  // 設定がない場合はデフォルト値を返す
  if (!result.Item) {
    return {
      userId,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
  }

  return result.Item as UserSettings;
};

// ユーザー設定更新
export const updateUserSettings = async (
  userId: string,
  settings: Partial<Pick<UserSettings, "displayName" | "avatarUrl" | "bio" | "theme" | "notifications">>
): Promise<UserSettings> => {
  // 既存の設定を取得
  const existing = await getUserSettings(userId);

  const now = new Date().toISOString();

  const updated: UserSettings = {
    userId,
    displayName: settings.displayName ?? existing.displayName,
    avatarUrl: settings.avatarUrl ?? existing.avatarUrl,
    bio: settings.bio ?? existing.bio,
    theme: settings.theme ?? existing.theme,
    notifications: settings.notifications ?? existing.notifications,
    updatedAt: now,
  };

  const command = new PutCommand({
    TableName: TABLE_NAMES.USER_SETTINGS,
    Item: updated,
  });

  await docClient.send(command);
  return updated;
};
