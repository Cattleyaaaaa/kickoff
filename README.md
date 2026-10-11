# Kickoff

足球资讯与球迷社区的独立原型。`v0.1.0` 是第一版可浏览的演示网站，未来可部署到 `kickoff.nextfield.top`，再与 Nextfield 整合。

## 本地启动

```bash
npm ci
npm run dev
```

开发服务器启动后，访问 Vite 输出的本地地址。构建命令为 `npm run build`，端到端测试命令为 `npm run test:e2e`（需先安装 Playwright 浏览器：`npx playwright install chromium`）。

## 当前原型

- 独立的首页、新闻、比赛、积分榜、球队和球员页面
- 新闻筛选、赛果筛选、球队关注与讨论示例
- 积分榜、球队目录、球员页面、比赛详情和赛后分析展示
- 简体中文、繁体中文、英文；按浏览器语言选默认语言
- 明亮、深色、跟随系统三种外观；球队关注保存在当前浏览器
- 使用 React、TypeScript、CSS 与 GSAP 构建响应式界面
- Playwright 交互测试覆盖主题/语言、关注列表、搜索筛选和赛果日期筛选

新闻和比赛分析仍是演示内容。赛果和积分榜已接入 Football-Data.org 的免费 API。球员页已移除虚构赛季数字，只有接入第二个免费数据源并成功同步后才会显示真实进球和助攻数据。用户账号、后台审核、真实新闻源和 DeepSeek 尚未接入。

## 启用真实赛果与积分榜

1. 在 [Football-Data.org](https://www.football-data.org/client/register) 注册免费账号，获取 API Key。免费档提供延迟赛果、赛程和积分榜，每分钟最多 10 次请求。
2. 打开 GitHub 仓库的 **Settings → Secrets and variables → Actions → New repository secret**，名称填写 `FOOTBALL_DATA_API_KEY`，值填写 API Key。不要把密钥写入代码或提交到仓库。
3. 在仓库的 **Actions → Update football data → Run workflow** 手动运行一次。成功后，工作流会更新 `public/data/football.json` 并提交到 `main`。
4. 此后工作流每天运行两次：**香港时间 06:00 和 18:00**（对应 UTC 前一天 22:00 和当天 10:00）。GitHub 的计划任务可能延迟；网站会显示实际更新时间。

同步覆盖英超、西甲、意甲、德甲、法甲和欧冠。比赛页展示最近七天已结束的比赛，并按浏览器所在时区显示日期；积分榜展示当前赛季可用的联赛表。免费档不提供完整进球事件或阵容。若某项赛事暂无积分榜，页面会明确显示为空。

本地同步可在 PowerShell 中运行：

```powershell
$env:FOOTBALL_DATA_API_KEY = '你的密钥'
npm run sync:football
Remove-Item Env:FOOTBALL_DATA_API_KEY
```

同步完成后运行 `npm run dev` 查看结果。首次同步之前，`public/data/football.json` 保持未配置状态，页面继续使用标明为演示的赛果和积分榜。同步失败时，工作流不会覆盖上一次成功的数据快照。可用 `npm run typecheck`、`npm run test:sync`、`npm run test:e2e` 验证代码。

数据来源：[Football-Data.org](https://www.football-data.org/)；网站使用真实数据时会在页脚显示其要求的署名。

## 启用真实球员数据

Football-Data.org 免费档只提供赛果、赛程和积分榜，不提供球员统计。球员页因此使用独立的 [GOAL API](https://goal-api.com/documentation) 免费 Key：

1. 在 GOAL API 注册免费账号并生成 API Key。
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions → New repository secret** 中添加 `GOAL_API_KEY`。不要把密钥写入前端代码或仓库。
3. 在 **Actions → Update football data → Run workflow** 手动运行一次。成功后会生成 `public/data/players.json`；之后与赛果、积分榜一样每天更新两次。

本地可在 PowerShell 中运行：

```powershell
$env:GOAL_API_KEY = '你的密钥'
npm run sync:players
Remove-Item Env:GOAL_API_KEY
```

同步仅接受标明为 **2026/27** 的六项赛事数据，并显示来源及更新时间。GOAL API 的射手榜提供进球、助攻和所属球队；若未提供出场次数、位置或国籍，页面显示“—”，不会猜测或沿用示例值。某项赛事若没有可验证的数据，会显示空状态。同步程序在没有任何有效数据时保留上一次成功快照。

## 图片来源

头条配图是 AngusConnaltyPhotos 拍摄的[真实足球比赛照片](https://commons.wikimedia.org/wiki/File:Soccer_match.jpg)，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 授权使用。页面通过 CSS 裁切显示，并在图片所在卡片中署名。该照片仅作新闻示意图，并非演示新闻对应比赛的现场照片。
