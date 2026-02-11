# 🚀 Vercel 部署指南 (KunFlip Arena)

## ⚠️ 关于数据库的重要说明

**问题**：当前项目使用的是 **SQLite**。
**原因**：Vercel 是 Serverless 环境，其文件系统是临时的（Ephemeral）。这意味着写入 SQLite 文件的数据会在重新部署或函数休眠后**丢失**。
**解决方案**：部署到 Vercel 时，必须将数据库迁移到 **PostgreSQL** (推荐 Vercel Postgres) 或 **MySQL** (如 PlanetScale)。

本指南将引导你使用 **Vercel Postgres** 完成部署。

---

## 🛠️ 第一步：准备代码

### 1. 修改 Prisma Schema
打开 `prisma/schema.prisma`，将 `provider` 从 `"sqlite"` 改为 `"postgresql"`：

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql" // 👈 修改这里 (原为 sqlite)
  url      = env("DATABASE_URL")
}
```

### 2. 更新依赖
由于本地环境可能没有 Postgres，你需要安装相关依赖（通常 Prisma Client 会自动处理，但建议重新生成）：

```bash
# 生成新的 Prisma Client
npx prisma generate
```

> **注意**：修改 provider 后，本地的 SQLite 数据库将无法通过 Prisma 连接。如果你想在本地继续开发，建议也连接到一个远程的 Postgres 开发库，或者在本地安装 Postgres。

---

## ☁️ 第二步：配置 Vercel 项目

1.  **推送代码**：将修改后的代码推送到 GitHub/GitLab。
2.  **创建项目**：登录 Vercel Dashboard，点击 **"Add New..."** -> **"Project"**，导入你的仓库。
3.  **添加存储 (Storage)**：
    *   在 Vercel 项目页面，点击 **"Storage"** 标签。
    *   点击 **"Connect Store"** -> 选择 **"Postgres"** (Vercel Postgres)。
    *   点击 **"Create"**，接受默认设置即可。
4.  **连接环境变量**：
    *   创建数据库后，Vercel 会自动将 `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` 等环境变量添加到你的项目中。
    *   **关键步骤**：你需要去 **"Settings"** -> **"Environment Variables"**，找到 `POSTGRES_PRISMA_URL`。
    *   Prisma 默认查找 `DATABASE_URL`。你可以将 `DATABASE_URL` 的值设置为引用 `POSTGRES_PRISMA_URL`，或者在 Prisma schema 中直接使用 `POSTGRES_PRISMA_URL` (但标准做法是使用 DATABASE_URL)。
    *   *推荐做法*：在 Vercel 环境变量设置中，添加一个新的变量 `DATABASE_URL`，其值复制自 `POSTGRES_PRISMA_URL`。

---

## 🔄 第三步：同步数据库结构

在 Vercel 构建之前或本地开发时，你需要将 Prisma Schema 推送到新的 Postgres 数据库：

1.  **拉取环境变量到本地** (可选，用于本地操作)：
    ```bash
    npm i -g vercel
    vercel link
    vercel env pull .env.development.local
    ```
2.  **推送数据库结构**：
    确保你的 `.env` 中 `DATABASE_URL` 指向了 Postgres 数据库（如果是 Vercel Postgres，连接串通常以 `postgres://` 开头）。
    ```bash
    npx prisma db push
    ```
    *这会在远程数据库中创建 User, Agent, Battle 等表。*

---

## 🚀 第四步：部署

1.  回到 Vercel Dashboard，点击 **"Deploy"** (如果之前失败了) 或推送新的 commit 触发部署。
2.  Vercel 会自动执行 `npm install`。
3.  我们在 `package.json` 中添加了 `postinstall` 脚本，它会自动运行 `prisma generate`。
4.  构建完成后，访问你的域名即可！

---

## 常见问题

**Q: 我可以在本地继续用 SQLite 吗？**
A: 可以，但很麻烦。你需要维护两个 `schema.prisma` 文件，或者每次提交前修改 provider。
**建议**：开发和生产环境保持一致，本地也使用 Postgres (可以通过 Docker 安装或直接连接 Vercel Postgres 的开发实例)。

**Q: 部署后报错 "P1001: Can't reach database server"**
A: 检查 Vercel 环境变量 `DATABASE_URL` 是否正确设置。对于 Serverless 环境，建议使用连接池 URL (Vercel 提供的 `POSTGRES_PRISMA_URL` 通常已包含优化)。
