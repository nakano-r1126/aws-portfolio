import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

// レスポンスヘッダー（CORS対応）
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// レスポンスを作成するヘルパー関数
const response = (
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

// メインハンドラー
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { rawPath } = event;

  // OPTIONSリクエスト（CORS対応）
  if (event.requestContext.http.method === "OPTIONS") {
    return response(200, {});
  }

  // ルーティング
  switch (rawPath) {
    case "/health":
      return response(200, { status: "ok" });

    case "/api/hello":
      return response(200, { message: "Hello from Lambda!" });

    case "/api/user":
      // TODO: Cognito認証後のユーザー情報取得
      return response(200, { message: "User endpoint" });

    default:
      return response(404, { error: "Not Found", path: rawPath });
  }
};
