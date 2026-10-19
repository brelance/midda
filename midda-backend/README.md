# midda-backend

Midda 阅读社区的 Java 21 / Spring Boot 后端，从 `midda-web/backend-refs/zhiguang_be` 迁入。包含 JWT 认证、个人资料、帖子、Feed、点赞收藏、关注、搜索、OSS 上传和 AI / RAG 模块。Maven artifact、应用名称、入口类和启动命令已统一为 `midda-backend`；保留原 Java 包名、API 路径和数据库字段以兼容原有客户端。

上游来源与原项目说明见 [UPSTREAM.md](UPSTREAM.md)，接口和设计文档位于 [docs/](docs/)。

## 本地启动

需要 JDK 21、Docker Compose 和 OpenSSL。首次运行 Maven Wrapper 会下载 Maven 3.9.11 及依赖。若 macOS 的 `java -version` 找不到 JDK，安装 JDK 21 并设置 `JAVA_HOME`；Homebrew 安装可使用：

```sh
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

从仓库根目录运行：

```sh
docker compose -f midda-backend/compose.yaml up -d --wait
sh midda-backend/scripts/generate-keys.sh
npm run midda-backend
```

也可在本目录运行 `./mvnw spring-boot:run`（Windows 使用 `mvnw.cmd`）。健康检查为 `http://localhost:8080/actuator/health`，匿名 Feed 为 `http://localhost:8080/api/v1/knowposts/feed?page=1&size=12`。新数据库 Feed 为空，真实接口不会返回演示帖子。

Compose 使用独立的 `midda-backend` 项目、卷和端口：

| 服务 | 本机地址 |
| --- | --- |
| MySQL 8.4 | `127.0.0.1:3308`，库/用户 `midda`，本地密码 `local-development` |
| Redis 7.4 | `127.0.0.1:6381` |
| Kafka 4.1 | `127.0.0.1:9096` |
| Elasticsearch 9.2 | `http://127.0.0.1:9202` |

数据库结构 [db/schema.sql](db/schema.sql) 在新 MySQL 卷初始化时导入。已有数据库需手动应用结构，不会因重启自动覆盖。停止本项目的中间件可执行 `docker compose -f midda-backend/compose.yaml stop`。

JWT 运行密钥保存在被 Git 忽略的 `secrets/`；生成脚本不会覆盖已有密钥。原项目密钥仅作为测试 fixture 放在 `src/test/resources/keys/`，不进入运行 JAR。部署时通过 `JWT_PRIVATE_KEY=file:/...` 和 `JWT_PUBLIC_KEY=file:/...` 指向独立密钥。

## 连接桌面阅读社区

仓库根目录 `.env` 中添加：

```dotenv
MIDDA_API_URL=http://localhost:8080
```

再运行 `npm run dev`。地址不要包含 `/api/v1`，修改后需要重启或重新构建桌面应用。未配置地址时社区展示带标识的演示数据。账号页和社区共用邮箱/手机号密码登录，令牌保留在 Electron 主进程；本地书库不自动上传。

前端现有功能：最新分享 / 我的发布、分页、详情摘要及正文外链、点赞/收藏与取消、Markdown 心得发布。话题和搜索筛选已加载内容。注册、密码找回、后端全文搜索、关注和 RAG 暂无社区 UI，原 Java API 保留。

## 创建本地账号

沿用原后端的验证码注册流程。当前 `LoggingCodeSender` 将验证码写到后端控制台，不发送真实短信或邮件；正式部署应接入实际发送器。

```sh
curl -fsS http://localhost:8080/api/v1/auth/send-code \
  -H 'Content-Type: application/json' \
  -d '{"scene":"REGISTER","identifierType":"EMAIL","identifier":"reader@example.com"}'

# 将 123456 替换为后端控制台里的验证码。
curl -fsS http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"identifierType":"EMAIL","identifier":"reader@example.com","code":"123456","password":"LocalReader123!","agreeTerms":true}'
```

随后在桌面账号页使用该邮箱和密码登录。

## 服务配置

默认值见 [application.yml](src/main/resources/application.yml)。支持环境变量覆盖；本目录的 [.env.example](.env.example) 是后端配置示例，与桌面根目录 `.env` 分开。Spring Boot 不自动加载 `.env`，可在本目录执行：

```sh
cp .env.example .env
# 按需编辑 .env，然后导入当前 shell
set -a
. ./.env
set +a
./mvnw spring-boot:run
```

- **发布心得**需要阿里云 OSS：设置 `OSS_ENDPOINT`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`，可选 `OSS_PUBLIC_DOMAIN`。Endpoint 使用域名，例如 `oss-cn-hangzhou.aliyuncs.com`。Bucket CORS 需允许桌面来源的 `PUT` / `Content-Type` 并暴露 `ETag`。流程为草稿 → 预签名 → 正文直传 → SHA-256/ETag 确认 → 元数据 → 发布，失败可在当前页面复用草稿重试。摘要限定 50 个字符，与数据库一致。
- **AI 摘要 / RAG**需要 DeepSeek 与 OpenAI embedding 配置。未配置密钥时账号、Feed、互动仍可运行，AI 请求不可用；桌面的 `LLM_*` 配置不会自动传入 Java。向量索引名默认为 `midda_vectors`。
- **全文搜索**沿用 `zhiguang_content_index` 索引名，现有映射要求 Elasticsearch 安装匹配版本的 `analysis-ik` 插件；Compose 使用官方原始镜像，未包含该插件。
- **关注与搜索的异步投影**沿用 Canal → Kafka Outbox 链路，需要单独部署 Canal、启用 MySQL binlog 并设置 `CANAL_ENABLED=true` 和对应连接配置。默认 Compose 不启动 Canal；阅读社区当前使用的 Feed 不依赖该投影。

## 验证与打包

从仓库根目录运行：

```sh
npm run test:community
npx tsc --noEmit
npx vite build
npm run midda-backend:test
npm run midda-backend:build
```

Java 产物为 `midda-backend/target/midda-backend-1.0-SNAPSHOT.jar`。从本目录执行 `java -jar target/midda-backend-1.0-SNAPSHOT.jar`，以便默认相对密钥路径正确解析。

客户端测试覆盖 JWT 刷新与退出竞态、会话恢复、IPC 白名单、雪花 ID 精度、发布步骤和摘要长度。Java 测试覆盖 JWT、热点检测与帖子缓存失效；这些测试不替代真实 OSS / AI 服务的联调。
