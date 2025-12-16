import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// ======================
// Lambda（バックエンドAPI）
// - リクエストが来た時だけ起動
// - 無料枠：100万リクエスト/月、40万GB秒/月
// ======================

// Lambda用のIAMロール
const lambdaRole = new aws.iam.Role("lambda-role", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: { Service: "lambda.amazonaws.com" },
        Effect: "Allow",
      },
    ],
  }),
});

// Lambda基本実行ポリシー（CloudWatch Logsへの書き込み権限）
new aws.iam.RolePolicyAttachment("lambda-basic-execution", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// DynamoDBアクセスポリシー
new aws.iam.RolePolicyAttachment("lambda-dynamodb", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
});

// Lambda関数（バックエンドAPI）
const backendLambda = new aws.lambda.Function("backend-api", {
  runtime: "nodejs20.x",
  handler: "index.handler",
  role: lambdaRole.arn,
  timeout: 30,
  memorySize: 256,
  // 初回デプロイ用のダミーコード（後でデプロイスクリプトで上書き）
  code: new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(`
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    },
    body: JSON.stringify({ message: "Hello from Lambda!", path: event.path })
  };
};
    `),
  }),
  environment: {
    variables: {
      NODE_ENV: "production",
      DYNAMODB_TABLE: "portfolio-users",
    },
  },
});

// ======================
// API Gateway（HTTPエンドポイント）
// - Lambdaを外部に公開
// - 無料枠：100万リクエスト/月（12ヶ月）
// ======================
const apiGateway = new aws.apigatewayv2.Api("backend-api-gateway", {
  protocolType: "HTTP",
  corsConfiguration: {
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
});

// Lambda統合（API Gateway → Lambda）
const lambdaIntegration = new aws.apigatewayv2.Integration("lambda-integration", {
  apiId: apiGateway.id,
  integrationType: "AWS_PROXY",
  integrationUri: backendLambda.arn,
  payloadFormatVersion: "2.0",
});

// ルート（全てのリクエストをLambdaに転送）
new aws.apigatewayv2.Route("api-route", {
  apiId: apiGateway.id,
  routeKey: "$default",
  target: pulumi.interpolate`integrations/${lambdaIntegration.id}`,
});

// ステージ（デプロイ環境）
new aws.apigatewayv2.Stage("api-stage", {
  apiId: apiGateway.id,
  name: "$default",
  autoDeploy: true,
});

// API GatewayからLambdaを呼び出す権限
new aws.lambda.Permission("api-gateway-permission", {
  action: "lambda:InvokeFunction",
  function: backendLambda.name,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${apiGateway.executionArn}/*/*`,
});

// ======================
// DynamoDB（データベース）
// - NoSQLデータベース
// - 無料枠：25GB、読み書き各25ユニット/秒
// ======================
const usersTable = new aws.dynamodb.Table("portfolio-users", {
  name: "portfolio-users",
  billingMode: "PAY_PER_REQUEST", // 従量課金（無料枠内なら$0）
  hashKey: "userId",
  attributes: [
    { name: "userId", type: "S" },
  ],
});

// ======================
// Cognito（ユーザー認証）
// - ユーザー登録・ログイン機能を提供
// - 無料枠：5万MAU（月間アクティブユーザー）
// ======================
const userPool = new aws.cognito.UserPool("portfolio-user-pool", {
  autoVerifiedAttributes: ["email"], // メール確認を自動化
  usernameAttributes: ["email"], // メールアドレスをユーザー名として使用
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
    requireUppercase: true,
  },
});

// Cognitoクライアント（フロントエンドから認証に使用）
const userPoolClient = new aws.cognito.UserPoolClient("portfolio-client", {
  userPoolId: userPool.id,
  explicitAuthFlows: [
    "ALLOW_USER_PASSWORD_AUTH", // パスワード認証を許可
    "ALLOW_REFRESH_TOKEN_AUTH", // リフレッシュトークンを許可
    "ALLOW_USER_SRP_AUTH", // セキュアリモートパスワード認証を許可
  ],
  supportedIdentityProviders: ["COGNITO"],
});

// ======================
// S3 + CloudFront（フロントエンドホスティング）
// - S3：静的ファイル（HTML/CSS/JS）を保存
// - CloudFront：CDNで高速配信 + HTTPS
// - 無料枠：S3 5GB、CloudFront 1TB/月
// ======================
const frontendBucket = new aws.s3.BucketV2("frontend-bucket", {});

// パブリックアクセスブロック設定
new aws.s3.BucketPublicAccessBlock("frontend-bucket-public-access-block", {
  bucket: frontendBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

// CloudFront用のオリジンアクセスコントロール
const oac = new aws.cloudfront.OriginAccessControl("frontend-oac", {
  name: "frontend-oac",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

// CloudFrontディストリビューション（CDN）
const distribution = new aws.cloudfront.Distribution("frontend-cdn", {
  enabled: true,
  defaultRootObject: "index.html",
  origins: [
    {
      domainName: frontendBucket.bucketRegionalDomainName,
      originId: "S3Origin",
      originAccessControlId: oac.id,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "S3Origin",
    viewerProtocolPolicy: "redirect-to-https", // HTTPをHTTPSにリダイレクト
    allowedMethods: ["GET", "HEAD"],
    cachedMethods: ["GET", "HEAD"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
  },
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: "/index.html", // SPAのルーティング対応
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html", // SPAのルーティング対応
    },
  ],
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true, // デフォルトのSSL証明書を使用
  },
});

// S3バケットポリシー（CloudFrontからのみアクセス許可）
const bucketPolicy = new aws.s3.BucketPolicy("frontend-bucket-policy", {
  bucket: frontendBucket.id,
  policy: pulumi
    .all([frontendBucket.arn, distribution.arn])
    .apply(([bucketArn, distArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`,
            Condition: {
              StringEquals: {
                "AWS:SourceArn": distArn,
              },
            },
          },
        ],
      })
    ),
});

// ======================
// 出力（デプロイ後に確認できる値）
// ======================
export const apiUrl = apiGateway.apiEndpoint; // バックエンドAPI URL
export const cloudfrontUrl = pulumi.interpolate`https://${distribution.domainName}`; // フロントエンドURL
export const s3BucketName = frontendBucket.id; // フロントエンドデプロイ先
export const cognitoUserPoolId = userPool.id; // Cognito設定用
export const cognitoClientId = userPoolClient.id; // Cognito設定用
export const dynamoTableName = usersTable.name; // DynamoDBテーブル名
