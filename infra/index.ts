import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// ======================
// Cognito（ユーザー認証）
// - ユーザー登録・ログイン機能を提供
// - 無料枠：5万MAU（月間アクティブユーザー）
// ======================
const userPool = new aws.cognito.UserPool("portfolio-user-pool", {
  autoVerifiedAttributes: ["email"],
  usernameAttributes: ["email"],
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
    requireUppercase: true,
  },
});

const userPoolClient = new aws.cognito.UserPoolClient("portfolio-client", {
  userPoolId: userPool.id,
  explicitAuthFlows: [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ],
  supportedIdentityProviders: ["COGNITO"],
});

// Cognitoグループ
new aws.cognito.UserGroup("admin-group", {
  userPoolId: userPool.id,
  name: "admin",
  description: "管理者グループ - 全機能にアクセス可能",
});

new aws.cognito.UserGroup("user-group", {
  userPoolId: userPool.id,
  name: "user",
  description: "一般ユーザーグループ - お気に入り保存、コメント可能",
});

// ======================
// DynamoDB（データベース）
// - NoSQLデータベース
// - 無料枠：25GB、読み書き各25ユニット/秒
// ======================

const trendsTable = new aws.dynamodb.Table("tech-trends", {
  name: "tech-trends",
  billingMode: "PAY_PER_REQUEST",
  hashKey: "id",
  attributes: [
    { name: "id", type: "S" },
    { name: "category", type: "S" },
  ],
  globalSecondaryIndexes: [
    {
      name: "category-index",
      hashKey: "category",
      projectionType: "ALL",
    },
  ],
});

const favoritesTable = new aws.dynamodb.Table("tech-trends-favorites", {
  name: "tech-trends-favorites",
  billingMode: "PAY_PER_REQUEST",
  hashKey: "userId",
  rangeKey: "trendId",
  attributes: [
    { name: "userId", type: "S" },
    { name: "trendId", type: "S" },
  ],
});

const userSettingsTable = new aws.dynamodb.Table("tech-trends-user-settings", {
  name: "tech-trends-user-settings",
  billingMode: "PAY_PER_REQUEST",
  hashKey: "userId",
  attributes: [
    { name: "userId", type: "S" },
  ],
});

// ======================
// S3（ユーザーアイコン用）
// - ユーザーがアップロードしたプロフィール画像を保存
// - Presigned URLでセキュアにアップロード
// ======================
const userIconsBucket = new aws.s3.BucketV2("user-icons-bucket", {});

new aws.s3.BucketPublicAccessBlock("user-icons-public-access-block", {
  bucket: userIconsBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: false,
  ignorePublicAcls: true,
  restrictPublicBuckets: false,
});

new aws.s3.BucketCorsConfigurationV2("user-icons-cors", {
  bucket: userIconsBucket.id,
  corsRules: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "PUT"],
      allowedOrigins: ["*"],
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3000,
    },
  ],
});

// アイコン画像を公開読み取り可能にするポリシー
new aws.s3.BucketPolicy("user-icons-bucket-policy", {
  bucket: userIconsBucket.id,
  policy: userIconsBucket.arn.apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `${arn}/*`,
        },
      ],
    })
  ),
});

// ======================
// Lambda（バックエンドAPI）
// - リクエストが来た時だけ起動
// - 無料枠：100万リクエスト/月、40万GB秒/月
// ======================

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

new aws.iam.RolePolicyAttachment("lambda-basic-execution", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

new aws.iam.RolePolicyAttachment("lambda-dynamodb", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
});

new aws.iam.RolePolicyAttachment("lambda-s3", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
});

const backendLambda = new aws.lambda.Function("backend-api", {
  runtime: "nodejs20.x",
  handler: "index.handler",
  role: lambdaRole.arn,
  timeout: 30,
  memorySize: 256,
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../backend/dist"),
    "node_modules": new pulumi.asset.FileArchive("../backend/node_modules"),
  }),
  environment: {
    variables: {
      NODE_ENV: "production",
      COGNITO_USER_POOL_ID: userPool.id,
      COGNITO_CLIENT_ID: userPoolClient.id,
      USER_ICONS_BUCKET: userIconsBucket.id,
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

const lambdaIntegration = new aws.apigatewayv2.Integration("lambda-integration", {
  apiId: apiGateway.id,
  integrationType: "AWS_PROXY",
  integrationUri: backendLambda.arn,
  payloadFormatVersion: "2.0",
});

new aws.apigatewayv2.Route("api-route", {
  apiId: apiGateway.id,
  routeKey: "$default",
  target: pulumi.interpolate`integrations/${lambdaIntegration.id}`,
});

new aws.apigatewayv2.Stage("api-stage", {
  apiId: apiGateway.id,
  name: "$default",
  autoDeploy: true,
});

new aws.lambda.Permission("api-gateway-permission", {
  action: "lambda:InvokeFunction",
  function: backendLambda.name,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${apiGateway.executionArn}/*/*`,
});

// ======================
// S3 + CloudFront（フロントエンドホスティング）
// - S3：静的ファイル（HTML/CSS/JS）を保存
// - CloudFront：CDNで高速配信 + HTTPS
// - 無料枠：S3 5GB、CloudFront 1TB/月
// ======================
const frontendBucket = new aws.s3.BucketV2("frontend-bucket", {});

new aws.s3.BucketPublicAccessBlock("frontend-bucket-public-access-block", {
  bucket: frontendBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

const oac = new aws.cloudfront.OriginAccessControl("frontend-oac", {
  name: "frontend-oac",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

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
    viewerProtocolPolicy: "redirect-to-https",
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
      responsePagePath: "/index.html",
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
  ],
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
});

new aws.s3.BucketPolicy("frontend-bucket-policy", {
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
export const apiUrl = apiGateway.apiEndpoint;
export const cloudfrontUrl = pulumi.interpolate`https://${distribution.domainName}`;
export const s3BucketName = frontendBucket.id;
export const lambdaName = backendLambda.name;
export const cognitoUserPoolId = userPool.id;
export const cognitoClientId = userPoolClient.id;
export const trendsTableName = trendsTable.name;
export const favoritesTableName = favoritesTable.name;
export const userSettingsTableName = userSettingsTable.name;
export const userIconsBucketName = userIconsBucket.id;
