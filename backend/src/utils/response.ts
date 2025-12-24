import { APIGatewayProxyResultV2 } from "aws-lambda";

// CORSヘッダー
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// 成功レスポンス
export const success = <T>(data: T, statusCode = 200): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...corsHeaders,
  },
  body: JSON.stringify(data),
});

// エラーレスポンス
export const error = (
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...corsHeaders,
  },
  body: JSON.stringify({
    error: message,
    ...details,
  }),
});

// 定型エラーレスポンス
export const unauthorized = (message = "Unauthorized"): APIGatewayProxyResultV2 =>
  error(message, 401);

export const forbidden = (message = "Forbidden"): APIGatewayProxyResultV2 =>
  error(message, 403);

export const notFound = (message = "Not Found"): APIGatewayProxyResultV2 =>
  error(message, 404);

export const badRequest = (message: string): APIGatewayProxyResultV2 =>
  error(message, 400);

export const serverError = (message = "Internal Server Error"): APIGatewayProxyResultV2 =>
  error(message, 500);

export const methodNotAllowed = (message = "Method Not Allowed"): APIGatewayProxyResultV2 =>
  error(message, 405);
