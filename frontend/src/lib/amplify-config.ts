import { Amplify } from "aws-amplify";

// Amplify設定（Cognito認証用）
// 環境変数がある場合はそちらを優先、なければハードコード値を使用
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "ap-northeast-1_IzEkDuEfS",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "43c1qnh8kna6uet171uu3iii5o",
      signUpVerificationMethod: "code" as const,
    },
  },
};

// Amplifyを初期化
export function configureAmplify() {
  Amplify.configure(amplifyConfig);
}
