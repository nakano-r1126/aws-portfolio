import { fetchAuthSession } from "aws-amplify/auth";

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://nyjllai5q4.execute-api.ap-northeast-1.amazonaws.com";

// 認証トークンを取得
const getAuthToken = async (): Promise<string | null> => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch {
    return null;
  }
};

// APIリクエスト用のヘッダーを作成
const getHeaders = async (requireAuth = false): Promise<HeadersInit> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

// レスポンスの型
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// APIリクエスト関数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<ApiResponse<T>> {
  try {
    const headers = await getHeaders(requireAuth);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || `Error: ${response.status}`,
      };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ====================
// トレンド関連API
// ====================

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

export interface TrendsResponse {
  trends: Trend[];
  total: number;
}

export const getTrends = (category?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (limit) params.append("limit", limit.toString());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<TrendsResponse>(`/api/trends${query}`);
};

export const getTrendById = (id: string) => {
  return apiRequest<{ trend: Trend }>(`/api/trends/${id}`);
};

export const getCategories = () => {
  return apiRequest<{ categories: string[] }>("/api/categories");
};

// ====================
// ユーザー関連API（認証必須）
// ====================

export interface UserProfile {
  id: string;
  email: string;
  role: "guest" | "user" | "admin";
  groups: string[];
}

export const getProfile = () => {
  return apiRequest<{ profile: UserProfile }>("/api/user/profile", {}, true);
};

// ====================
// お気に入り関連API（認証必須）
// ====================

export interface Favorite {
  userId: string;
  trendId: string;
  createdAt: string;
  trend?: Trend;
}

export interface FavoritesResponse {
  favorites: Favorite[];
  total: number;
}

export const getFavorites = () => {
  return apiRequest<FavoritesResponse>("/api/user/favorites", {}, true);
};

export const addFavorite = (trendId: string) => {
  return apiRequest<{ message: string; favorite: Favorite }>(
    "/api/user/favorites",
    {
      method: "POST",
      body: JSON.stringify({ trendId }),
    },
    true
  );
};

export const removeFavorite = (trendId: string) => {
  return apiRequest<{ message: string; trendId: string }>(
    `/api/user/favorites/${trendId}`,
    { method: "DELETE" },
    true
  );
};

// ====================
// ユーザー設定API（認証必須）
// ====================

export interface UserSettings {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  theme: "light" | "dark";
  notifications: boolean;
  updatedAt: string;
}

export const getSettings = () => {
  return apiRequest<{ settings: UserSettings }>("/api/user/settings", {}, true);
};

export const updateSettings = (settings: {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  theme?: "light" | "dark";
  notifications?: boolean;
}) => {
  return apiRequest<{ settings: UserSettings; message: string }>(
    "/api/user/settings",
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
    true
  );
};

// アップロードURL取得
export interface UploadUrlResponse {
  uploadUrl: string;
  avatarUrl: string;
  expiresIn: number;
}

export const getUploadUrl = (contentType: string) => {
  return apiRequest<UploadUrlResponse>(
    "/api/user/upload-url",
    {
      method: "POST",
      body: JSON.stringify({ contentType }),
    },
    true
  );
};

// 画像をS3にアップロード
export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string | null; error: string | null }> => {
  try {
    // Presigned URL取得
    const urlResult = await getUploadUrl(file.type);
    if (urlResult.error || !urlResult.data) {
      return { avatarUrl: null, error: urlResult.error || "Failed to get upload URL" };
    }

    // S3にアップロード
    const uploadResponse = await fetch(urlResult.data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      return { avatarUrl: null, error: "Failed to upload image" };
    }

    return { avatarUrl: urlResult.data.avatarUrl, error: null };
  } catch (error) {
    return {
      avatarUrl: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// ====================
// 管理者API（管理者権限必須）
// ====================

export const createTrend = (trend: {
  name: string;
  category: string;
  description: string;
  popularity?: number;
  growth?: number;
}) => {
  return apiRequest<{ trend: Trend; message: string }>(
    "/api/admin/trends",
    {
      method: "POST",
      body: JSON.stringify(trend),
    },
    true
  );
};

export const updateTrend = (id: string, trend: Partial<Omit<Trend, "id" | "createdAt" | "updatedAt">>) => {
  return apiRequest<{ trend: Trend; message: string }>(
    `/api/admin/trends/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(trend),
    },
    true
  );
};

export const deleteTrend = (id: string) => {
  return apiRequest<{ message: string; id: string }>(
    `/api/admin/trends/${id}`,
    { method: "DELETE" },
    true
  );
};
