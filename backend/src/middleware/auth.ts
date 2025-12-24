import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEventV2 } from "aws-lambda";

// ユーザーロール
export type UserRole = "guest" | "user" | "admin";

// 認証済みユーザー情報
export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  groups: string[];
}

// 認証結果
export interface AuthResult {
  isAuthenticated: boolean;
  user: AuthUser | null;
  error?: string;
}

// Cognito設定（環境変数から取得）
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

// JWT検証器（遅延初期化）
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

const getVerifier = () => {
  if (!verifier && USER_POOL_ID && CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: "access",
      clientId: CLIENT_ID,
    });
  }
  return verifier;
};

// Authorizationヘッダーからトークンを抽出
const extractToken = (event: APIGatewayProxyEventV2): string | null => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
};

// ユーザーのロールを判定
const determineRole = (groups: string[]): UserRole => {
  if (groups.includes("admin")) return "admin";
  return "user";
};

// トークンを検証してユーザー情報を取得
export const verifyAuth = async (
  event: APIGatewayProxyEventV2
): Promise<AuthResult> => {
  const token = extractToken(event);

  // トークンがない場合はゲスト
  if (!token) {
    return {
      isAuthenticated: false,
      user: null,
    };
  }

  const jwtVerifier = getVerifier();
  if (!jwtVerifier) {
    return {
      isAuthenticated: false,
      user: null,
      error: "Auth configuration missing",
    };
  }

  try {
    const payload = await jwtVerifier.verify(token);

    // Cognitoグループを取得
    const groups = (payload["cognito:groups"] as string[]) || [];

    const user: AuthUser = {
      sub: payload.sub,
      email: (payload.email as string) || (payload.username as string) || "",
      role: determineRole(groups),
      groups,
    };

    return {
      isAuthenticated: true,
      user,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      user: null,
      error: error instanceof Error ? error.message : "Token verification failed",
    };
  }
};

// 認証が必要なエンドポイント用ガード
export const requireAuth = (auth: AuthResult): auth is AuthResult & { user: AuthUser } => {
  return auth.isAuthenticated && auth.user !== null;
};

// 特定のロールが必要なエンドポイント用ガード
export const requireRole = (auth: AuthResult, requiredRoles: UserRole[]): boolean => {
  if (!requireAuth(auth)) return false;
  return requiredRoles.includes(auth.user.role);
};

// 管理者権限チェック
export const requireAdmin = (auth: AuthResult): boolean => {
  return requireRole(auth, ["admin"]);
};
