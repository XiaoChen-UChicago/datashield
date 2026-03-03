# DataShield Pro · Preview Console

DataShield Pro 是一个面向企业安全团队的敏感数据检测与脱敏平台。本项目为测试版控制台，支持将文本 / 日志 / API 响应粘贴到工作台，实时检测常见凭证并按策略输出脱敏结果，同时生成审计报表。

## 功能
- **实时检测**：OpenAI / AWS / GitHub / Slack 密钥，JWT、Webhook、邮箱、手机号、身份证、银行卡（含 Luhn 校验）等。
- **三种策略**：Mask（脱敏）、Encrypt（指纹）、Tokenize（令牌金库，可通过受控 API 还原）。
- **事件留痕**：所有检测事件写入数据库，可在控制台查询最近记录。
- **API**：`POST /api/scan`、`GET /api/report`、`GET /api/token/[token]`（需 `x-vault-key`）。

## 技术栈
- Next.js 15 (App Router) + Tailwind UI
- Prisma ORM + libSQL/Turso adapter（Railway 可直接使用）
- SQLite schema（可切换到 Postgres）
- TypeScript + ESLint + Turbopack

## 本地开发
```bash
npm install
npx prisma migrate dev
npm run dev
```

访问 <http://localhost:3000>

## 环境变量
复制 `.env.example` → `.env.local`，并按需填写：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | libSQL / Turso 连接串（本地可用 `file:./dev.db`） |
| `DATABASE_AUTH_TOKEN` | Turso auth token（本地文件可留空） |
| `TOKEN_VAULT_KEY` | Token 金库 AES Key（默认 demo） |
| `TOKEN_VAULT_ADMIN_KEY` | 调用 `/api/token/[token]` 所需 header key |

## Railway 部署快速指引
1. **Fork / 推送** 本仓库到 GitHub。
2. 在 Railway 新建项目 → 选择 GitHub 仓库。
3. 添加环境变量：
   - `DATABASE_URL`（推荐新建 Turso / LibSQL 数据库，复制连接串）
   - `DATABASE_AUTH_TOKEN`（若 Turso 需要）
   - `TOKEN_VAULT_KEY` & `TOKEN_VAULT_ADMIN_KEY`
4. 预设构建命令 `npm run build`，启动命令 `npm run start`。
5. 部署后执行 `npx prisma migrate deploy`（可在 Railway 的 shell 执行）来同步 schema。

如需改用 Postgres，把 `prisma/schema.prisma` 的 datasource 改成 `provider = "postgresql"` 并在 `src/lib/prisma.ts` 使用 `@prisma/adapter-pg`。

## API 示例
```
POST /api/scan
{
  "text": "sk-XXXXXX",
  "strategy": "mask"
}
```

响应包含 `processedText`、`detections`、`eventId`、`elapsedMs`。

## Roadmap
- Policy-as-Code + YAML 版本管理
- LLM Guard 插件 & 上下文感知检测
- 多租户 / SSO / 计费 / BYOK

欢迎基于此测试版继续扩展。若在部署中遇到问题，可查看 `prisma/migrations` 或调试 `/src/lib/*`。