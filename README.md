# Kickoff

足球资讯与球迷社区的独立原型。`v0.1.0` 是第一版可浏览的演示网站，未来可部署到 `kickoff.nextfield.top`，再与 Nextfield 整合。

## 本地启动

```bash
npm ci
npm run dev
```

开发服务器启动后，访问 Vite 输出的本地地址。构建命令为 `npm run build`，端到端测试命令为 `npm run test:e2e`（需先安装 Playwright 浏览器：`npx playwright install chromium`）。

### Java 后端

后端使用 Java 21+、Maven 和 Spring Boot，提供 `GET /api/v1/football`（已核实的赛果、赛程和积分榜快照）及 `GET /api/v1/health`。在另一个终端运行：

```powershell
cd backend
mvn '-Dmaven.repo.local=.m2' spring-boot:run
```

默认端口为 `8080`，快照目录为项目的 `public/data`。如果从其他工作目录启动后端，请用 `KICKOFF_SNAPSHOT_DIR` 环境变量指定快照目录。Vite 开发服务器会把 `/api` 请求转发给 Java；后端未运行时，前端继续读取原有静态 JSON。生产环境部署 Java 后端时，应将同域名的 `/api` 路径转发到后端。当前 GitHub Actions 仍负责生成 Football-Data.org 快照；PitchAPI 的公开展示许可和整季完整性确认前，不会把它的数据发布到球队榜或球员榜。

### 在本地预览球队和球员进阶统计

PitchAPI 的覆盖核验工作流只抽查数据，不会生成网站榜单。Java 后端现在提供完整赛季的汇总器：按六项赛事列出本赛季已结束比赛，逐场读取球队、球员和进阶统计，再按球队与球员汇总。生成文件包含各赛事已结束场次与统计覆盖场次；没有记录的指标保持空白。运行前需要自己的 PitchAPI Key。请在项目根目录的 PowerShell 终端执行；脚本会隐藏密钥输入，并使用 `JAVA_HOME` 中的 Java：

```powershell
& .\scripts\sync-local-advanced.ps1
```

完成后刷新本地页面 `/team-stats` 和 `/players`。`public/data/advanced.json` 已加入 `.gitignore`，用于本地预览。此同步会读取整季已结束比赛，比赛越多运行越久；失败时不会覆盖上一次完整生成的文件。PitchAPI 的官网说明免费 Key 可访问所有赛事和进阶统计，但目前未找到公开的数据再展示或再分发许可条款；确认后才能把进阶统计加入公开仓库和定时发布流程。[PitchAPI 文档](https://pitchapi.dev/)

已有 `advanced.json` 但球员红黄牌缺失时，可运行 `& .\scripts\sync-local-cards.ps1`。它保留现有进阶统计，只读取六项赛事的比赛列表和每场牌事件；若当前完赛场数与快照不同或事件不完整，会保留原文件并提示需要完整同步。红黄牌来自比赛事件，未领牌的已收录球员记为 0。此脚本同样只更新本地预览，不会发布到 GitHub。

### 自动更新本地球队榜和球员榜

GitHub 每天两次的工作流更新的是远端比赛结果和积分榜，不会改动本地的 `advanced.json`。若要让本地进阶统计、球员红黄牌也每天自动更新，在 Windows 项目根目录的 PowerShell 终端一次性运行：

```powershell
& .\scripts\install-local-advanced-schedule.ps1
```

安装脚本会构建 Java 同步器；已有本地加密 Key 时会复用，否则才隐藏提示输入一次 PitchAPI Key，并用当前 Windows 用户加密保存到被 Git 忽略的 `backend/.cache/`。随后立即进行首次更新，并注册每天本机时间 06:00、18:00 的计划任务；电脑需要开机且当前用户已登录，错过的任务会在下次可运行时补执行。PitchAPI 本地同步会使用 `HTTPS_PROXY` 环境变量（如 `http://127.0.0.1:7897`）。运行记录位于 `backend/.cache/scheduled-advanced-sync.log`。此方案只更新本地文件，不会把 PitchAPI 数据提交到 GitHub。要移除计划任务，可运行 `Unregister-ScheduledTask -TaskName 'Kickoff Advanced Football Data' -Confirm:$false`，并删除 `backend/.cache/pitchapi-key.xml`。

球队榜使用球队英文名别名表，按站点语言展示简体、繁体或英文。球员榜优先使用本地译名缓存 `public/data/advanced-names.json`，再回退到内置常见球员译名。首次批量翻译时，在项目根目录运行 `& .\scripts\translate-local-advanced-names.ps1` 并按隐藏提示输入 DeepSeek Key；Key 会加密保存在当前 Windows 用户的 `backend/.cache/deepseek-key.xml`。脚本按批保存译名，可重复运行补全失败批次。此后本地早晚同步会为新球员名自动补译；打开中的页面每 5 分钟刷新一次译名缓存。译名缓存和 Key 都不会提交到仓库。翻译请求只向 DeepSeek 发送球员姓名，生成译名仍需人工核对，特别是同名球员。

2026 年 10 月首次生成的本地快照已通过 `node scripts/repair-local-advanced.ts` 离线修复，原文件备份在 `backend/.cache/`。该脚本仅识别那一版六项赛事快照的重复字段，不请求 API，也不适用于后续正常生成的文件。页面会标明“本地离线修复快照”。

## 当前原型

- 独立的首页、新闻、比赛、积分榜、球队榜、球队和球员页面
- 新闻筛选、赛果筛选、球队关注与讨论示例
- 积分榜、球队目录、球员页面、比赛详情和赛后分析展示
- 简体中文、繁体中文、英文；按浏览器语言选默认语言
- 明亮、深色、跟随系统三种外观；球队关注保存在当前浏览器
- 使用 React、TypeScript、CSS 与 GSAP 构建响应式界面
- Playwright 交互测试覆盖主题/语言、关注列表、搜索筛选和赛果日期筛选

新闻和比赛分析仍是演示内容。赛果、赛程和积分榜使用 Football-Data.org 免费 API；真实快照加载失败时，比赛页显示不可用状态，不再回退到编造的比分。球队页展示赛程、积分榜和多类别球队统计；球员页展示进攻、传控、突破、防守与纪律指标。只有数据源提供并核实的数值才显示，其余用“—”表示缺失。用户账号、后台审核和真实新闻源尚未接入。

## 启用真实赛果与积分榜

1. 在 [Football-Data.org](https://www.football-data.org/client/register) 注册免费账号，获取 API Key。免费档提供延迟赛果、赛程和积分榜，每分钟最多 10 次请求。
2. 打开 GitHub 仓库的 **Settings → Secrets and variables → Actions → New repository secret**，名称填写 `FOOTBALL_DATA_API_KEY`，值填写 API Key。不要把密钥写入代码或提交到仓库。
3. 在仓库的 **Actions → Update football data → Run workflow** 手动运行一次。成功后，工作流会更新 `public/data/football.json` 并提交到 `main`。
4. 此后工作流每天运行两次：**香港时间 06:00 和 18:00**（对应 UTC 前一天 22:00 和当天 10:00）。GitHub 的计划任务可能延迟；网站会显示实际更新时间。

同步覆盖英超、西甲、意甲、德甲、法甲和欧冠。比赛页整合本赛季完整赛程与最近七天赛果，并支持按赛事、月份、球队筛选。球队榜和积分榜分别独立成页；球队页用于浏览和关注球队，不重复展示赛程、近期赛果。球队榜基础字段来自 Football-Data.org 积分榜；GOAL API 同步流程准备按当前赛季补充其文档列出的球队赛季统计。球队榜以整行浅色区分赛事区间，并在区间起始行右侧显示名称：各联赛按自己的规则配置。英超第 18–20 名直接降级，没有固定升降级附加赛，第 5 名欧冠或欧联待定，欧协杯名额不能固定标给第 6 名；德甲与法甲第 16 名标为升降级附加赛区，法甲第 4 名标为欧冠资格赛区；欧冠联赛阶段显示直通十六强、淘汰赛附加赛和出局区。其他联赛的欧联和欧协杯只标为候选，杯赛冠军、UEFA 额外名额和资格限制可能改变席位，页面附有官方规则链接。开球时间按浏览器所在时区显示。淘汰赛点球比分与常规/加时比赛比分分开显示。旧快照没有完整赛季赛程和进失球字段，需要重新运行同步后才会显示。缺失的统计明确显示为空。

本地同步现在由 Java 后端执行，可在 PowerShell 中运行：

```powershell
$env:FOOTBALL_DATA_API_KEY = '你的密钥'
$env:KICKOFF_SNAPSHOT_DIR = 'public/data'
mvn -f backend/pom.xml '-Dmaven.repo.local=backend/.m2' -DskipTests package
java -jar backend/target/kickoff-backend-0.1.0.jar --spring.main.web-application-type=none --kickoff.sync-on-start=true
Remove-Item Env:FOOTBALL_DATA_API_KEY
Remove-Item Env:KICKOFF_SNAPSHOT_DIR
```

同步完成后运行 `npm run dev` 查看结果。旧快照仍可显示赛果和积分榜，但要重新同步才会包含未来赛程与进失球。同步失败时，工作流不会覆盖上一次成功的数据快照。可用 `npm run typecheck`、`npm run test:sync`、`npm run test:e2e` 验证代码。

数据来源：[Football-Data.org](https://www.football-data.org/)；网站使用真实数据时会在页脚显示其要求的署名。

新闻页和首页新闻列表通过 Java 接口 `/api/v1/news` 读取 BBC Sport 足球 RSS。页面显示原始标题、发布时间和原文链接，并标明 BBC Sport 来源；不复制正文或使用 BBC 标志。Java 后端在内存中缓存 10 分钟，页面每 10 分钟刷新，亦可点击“刷新”。本地浏览时需同时启动 Vite 与 Java 后端。BBC 说明网站可展示其 RSS 标题，但须注明来源并遵守其使用条款；商业使用前需另行确认许可。[BBC Sport RSS 使用说明](https://www.bbc.co.uk/sport/articles/cqllxj2n4kyo)

自有新闻稿可写入 `content/news.json` 的 `articles` 数组。每篇需有固定 `id`、原创简体中文 `title`、`summary` 与 `body`、`category`、ISO 格式的 `publishedAt` 和 HTTPS `url`（用于打开核实资料的来源）。`npm run generate:news` 会从最近 36 小时的 Football-Data.org 已完赛记录直接生成原创赛果稿；标题、摘要、比分和统计数字都由程序根据赛果快照整理，避免生成模型改写事实；重复比赛不会再次成稿。运行 `npm run publish:news` 后，脚本用 `DEEPSEEK_API_KEY` 将标题、摘要和正文翻译为繁体中文、英文，并写入 `public/data/news.json`。本地可在项目 PowerShell 中运行 `& .\scripts\run-local-news.ps1`，脚本读取当前 Windows 用户加密保存的 DeepSeek Key；首次需要输入 Key 时会隐藏输入并加密保存。翻译缓存位于被忽略的 `backend/.cache/news-translations.json`，文章内容未变时不会重复付费。同一篇稿件按浏览器或站点语言显示。生成的快照有稿件时，Java 新闻接口优先展示这些自有稿件；暂无稿件时仍展示 BBC 原文标题。GitHub Actions 每次同步足球赛果后也会生成并提交译文快照。发布前应人工核对姓名、比分和译文。仅将自有稿件或取得翻译授权的内容放入 `content/news.json`，不要填入 BBC/ESPN 的转载标题或摘要。

单篇稿件格式：`{"id":"match-2026-10-12-001","title":"原创中文标题","summary":"原创中文摘要","body":"原创中文正文，段落间留一个空行。","category":"英超","publishedAt":"2026-10-12T12:00:00Z","url":"https://example.com/verified-source"}`。`id` 在修改标题或译文时保持不变；`url` 应指向你实际核实过的资料来源。正文上限 8000 字符，以控制单篇翻译成本和输出长度。

## 球员与球队进阶数据

### 核对 API-Football 的 2026/27 赛季覆盖

仓库另有手动工作流 **Verify API-Football coverage**。在 GitHub Actions 仓库密钥中新增 `API_FOOTBALL_KEY` 后运行一次，它只读取六项赛事的赛季覆盖标志、球员统计第一页和最近一场已结束比赛的球队/球员统计样本。最多使用 24 次 API-Football 请求，不修改数据快照或网站。日志中的 `coverage` 与 `playerSample.populatedFields` 用于判定哪些指标有实际值；一场比赛的样本不能证明整季每场都有这些指标。

Football-Data.org 免费档只提供赛果、赛程和积分榜，不提供进阶统计。GitHub Actions 中的 **Update football data** 继续每天两次更新这些基础数据；运行成功不代表球队榜和球员榜已有完整指标。

该工作流配置为香港时间每天 06:00 和 18:00 触发，但 GitHub Actions 的定时执行可能延迟或跳过。运行记录在仓库的 **Actions → Update football data** 页面；它只提交远端的 `public/data/football.json`，不会自动把更新拉到本地，也不会更新本地忽略提交的 `advanced.json` 或 `advanced-names.json`。

旧 GOAL API 球员同步器仍保留供手动核查，但射手榜无法证明全部球员的当前赛季球队归属，网站不会自动发布其快照。若要预览进阶指标，请按上文使用 PitchAPI 的 Java 汇总器。它读取六项赛事的本赛季已结束比赛，逐场汇总并标明覆盖场次；缺失的指标显示为空。尚未确认公开再展示许可前，生成文件只在本地使用。

### 球队与球员统计的数据来源

| 字段 | 当前可用来源 | 展示规则 |
| --- | --- | --- |
| 赛程、积分、进球、失球 | [Football-Data.org](https://www.football-data.org/documentation/api) 免费档 | 当前赛季、六项赛事；进失球来自积分榜总表 |
| 球队积分、胜平负、进失球、净胜球 | [Football-Data.org](https://www.football-data.org/documentation/api) 当前赛季总积分榜 | 直接来自联赛排名数据 |
| 球队射门、射正、传球、控球率、纪律等 | [PitchAPI](https://pitchapi.dev/) 本地预览 | 逐场汇总；只显示实际返回的字段，并标注统计覆盖场次 |
| 球员进球、助攻、出场、传球、突破、防守等 | [PitchAPI](https://pitchapi.dev/) 本地预览 | 逐场汇总；只显示实际返回的字段，并标注统计覆盖场次 |

球队、球员的进攻、传控、突破、防守、纪律栏目只展示数据源返回的数字。射正率、射门转化率和过人成功率只在原始分子和分母都可用时计算。PitchAPI 的基础统计与进阶事件统计对成功传球的口径有差异；传球次数及传球成功率统一取进阶事件统计，赛季成功率按每场尝试传球次数加权，成功传球次数暂留空。PitchAPI 的公开条款、六项赛事整季逐场统计覆盖率及其与官方记录的一致性仍须核对，本地预览不能视为已审核的公开数据。

## 图片来源

头条配图是 AngusConnaltyPhotos 拍摄的[真实足球比赛照片](https://commons.wikimedia.org/wiki/File:Soccer_match.jpg)，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 授权使用。页面通过 CSS 裁切显示，并在图片所在卡片中署名。该照片仅作新闻示意图，并非演示新闻对应比赛的现场照片。

## 后端部署安全基线

Java API 使用 Spring Security 默认拒绝策略，仅匿名开放 `GET`/`HEAD /api/v1/football`、`/api/v1/news` 和 `/api/v1/health`；其他路径与写入方法均拒绝。API 无登录状态，不接受凭据，不启用 Cookie 会话。生产环境若前后端不同源，设置 `KICKOFF_CORS_ALLOWED_ORIGINS` 为逗号分隔的精确 HTTPS 网站来源，例如 `https://kickoff.example.com`，不要配置 `*`。本地 Vite 通过代理访问，无需设置该变量。

部署时还需由 HTTPS 反向代理/CDN 终止 TLS、限制来源 IP 访问 Java 端口，并对 API 设置请求速率和连接数限制。RSS 上游请求有 10 秒连接超时、20 秒总超时、1 MiB 响应上限和 10 分钟服务端缓存；客户端无法强制刷新上游。新增登录、评论或管理写入接口前，必须先配置认证、逐资源授权及适用的 CSRF 防护，并审查限流与审计日志。不要把密钥放进前端变量、仓库或日志；若密钥曾暴露，应先在供应商处撤销并轮换。

仓库提供一套可选的自托管 Docker Compose 模板，位于 `deploy/`：前端 Nginx 对外提供 HTTPS，Java 容器不发布主机端口，只连内部网络；API 路由有方法白名单和每 IP 限流。服务器需先安装 Docker Compose、将 `kickoff.nextfield.top` DNS 指向服务器，并把 TLS 证书链和私钥分别放到 `deploy/certs/fullchain.pem`、`deploy/certs/privkey.pem`（目录被 Git 与 Docker build context 排除）。然后在仓库根目录运行 `docker compose -f deploy/compose.production.yml up -d --build`。证书签发与续期由服务器上的 ACME/证书工具负责；续期后需重启前端容器使 Nginx 重新读取证书。若使用其他托管平台，可只沿用 Spring Security、CORS 和 RSS 上限配置，不必采用这份 Docker 模板。
