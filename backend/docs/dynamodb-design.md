# DynamoDB テーブル設計

## 1. trends テーブル（トレンドデータ）

技術トレンドの情報を保存

| 属性 | 型 | 説明 |
|------|-----|------|
| id (PK) | String | トレンドID (UUID) |
| name | String | 技術名 (React, AWS等) |
| category | String | カテゴリ (Frontend, Cloud等) |
| description | String | 説明 |
| popularity | Number | 人気度 (0-100) |
| growth | Number | 成長率 (%) |
| createdAt | String | 作成日時 (ISO8601) |
| updatedAt | String | 更新日時 (ISO8601) |

**GSI (グローバルセカンダリインデックス)**
- `category-index`: category で検索用

---

## 2. favorites テーブル（お気に入り）

ユーザーのお気に入り登録

| 属性 | 型 | 説明 |
|------|-----|------|
| userId (PK) | String | ユーザーID (Cognito sub) |
| trendId (SK) | String | トレンドID |
| createdAt | String | 登録日時 (ISO8601) |

**アクセスパターン**
- ユーザーのお気に入り一覧: `userId` で Query
- 特定のお気に入り削除: `userId` + `trendId` で Delete

---

## 3. user_settings テーブル（ユーザー設定）

ユーザーごとの設定

| 属性 | 型 | 説明 |
|------|-----|------|
| userId (PK) | String | ユーザーID (Cognito sub) |
| theme | String | テーマ (light/dark) |
| notifications | Boolean | 通知設定 |
| updatedAt | String | 更新日時 (ISO8601) |

---

## テーブル作成 (AWS CLI)

```bash
# trends テーブル
aws dynamodb create-table \
  --table-name tech-trends \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=category,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[{"IndexName":"category-index","KeySchema":[{"AttributeName":"category","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# favorites テーブル
aws dynamodb create-table \
  --table-name tech-trends-favorites \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=trendId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=trendId,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# user_settings テーブル
aws dynamodb create-table \
  --table-name tech-trends-user-settings \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

## 無料枠について

- 25GB のストレージ
- 読み取り 25ユニット / 書き込み 25ユニット
- このアプリなら余裕で無料枠内
