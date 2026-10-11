# Kickoff

足球资讯与球迷社区的独立原型。`v0.1.0` 是第一版可浏览的演示网站，未来可部署到 `kickoff.nextfield.top`，再与 Nextfield 整合。

## 本地启动

```bash
npm ci
npm run dev
```

开发服务器启动后，访问 Vite 输出的本地地址。构建命令为 `npm run build`，端到端测试命令为 `npm run test:e2e`（需先安装 Playwright 浏览器：`npx playwright install chromium`）。

## 当前原型

- 独立的首页、新闻、比赛、球队和球员页面；积分榜已并入球队页
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

本地同步可在 PowerShell 中运行：

```powershell
$env:FOOTBALL_DATA_API_KEY = '你的密钥'
npm run sync:football
Remove-Item Env:FOOTBALL_DATA_API_KEY
```

同步完成后运行 `npm run dev` 查看结果。旧快照仍可显示赛果和积分榜，但要重新同步才会包含未来赛程与进失球。同步失败时，工作流不会覆盖上一次成功的数据快照。可用 `npm run typecheck`、`npm run test:sync`、`npm run test:e2e` 验证代码。

数据来源：[Football-Data.org](https://www.football-data.org/)；网站使用真实数据时会在页脚显示其要求的署名。

## 启用真实球员数据

Football-Data.org 免费档只提供赛果、赛程和积分榜，不提供球员统计。球员页因此使用独立的 [GOAL API](https://goal-api.com/documentation) 免费 Key：

1. 在 GOAL API 注册免费账号并生成 API Key；在 DeepSeek API 控制台获取用于球员姓名本地化的 API Key。
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions → New repository secret** 中添加 `GOAL_API_KEY` 和 `DEEPSEEK_API_KEY`。不要把密钥写入前端代码或仓库。
3. 在 **Actions → Update football data → Run workflow** 手动运行一次。任务每天运行两次并更新 `public/data/players.json`；射手榜请求明确指定当前赛季，行记录若自带赛季或赛事 ID，也会核对是否匹配。任务会尝试同步球队赛季统计并将可识别的数据写入 `public/data/football.json`。

当前球员列表来自射手榜端点，单项赛事最多取 100 条射手记录，不等于完整球队名单。同步日志会报告球队列表数量、与 Football-Data.org 积分榜匹配的球队数量、统计响应数量和已识别统计的数量；如果显示 0，就表示球队进阶数据尚未接入成功，不能把 workflow 的绿色状态视为该数据已齐全。脚本还会打印一次球员赛季统计与球队名单响应的字段名，供后续按实际结构扩展完整球员统计，日志不包含 API Key。

本地可在 PowerShell 中运行：

```powershell
$env:GOAL_API_KEY = '你的密钥'
$env:DEEPSEEK_API_KEY = '你的密钥'
npm run sync:players
Remove-Item Env:GOAL_API_KEY
Remove-Item Env:DEEPSEEK_API_KEY
```

此前 GOAL API 快照曾把已离开巴萨的莱万多夫斯基列为巴萨球员，因此同步已改为对射手榜明确指定当前赛季。端点按赛事和赛季作用域返回的记录不再因为缺少重复的行级赛季字段而整榜丢弃；若某条记录自行提供赛季或赛事 ID，则必须与请求范围相符。该检查降低旧赛季误混入风险，但不能替代对球队归属的核对。页面显示实际返回的进球、助攻、点球进球、出场数及随记录提供的其他统计；缺失字段为空。DeepSeek 只负责姓名翻译，不负责核实统计。

### 球队与球员统计的数据来源

| 字段 | 当前可用来源 | 展示规则 |
| --- | --- | --- |
| 赛程、积分、进球、失球 | [Football-Data.org](https://www.football-data.org/documentation/api) 免费档 | 当前赛季、六项赛事；进失球来自积分榜总表 |
| 球队积分、胜平负、进失球、净胜球 | [Football-Data.org](https://www.football-data.org/documentation/api) 当前赛季总积分榜 | 直接来自联赛排名数据 |
| 球队场均射门、平均控球率、零封 | [GOAL API 球队统计](https://goal-api.com/blog/football-stats-api) | 按赛季端点抓取，按球队短码或名称匹配；未返回或无法匹配则为空 |
| 球队总射门、射正、传球、红黄牌、越位等 | 暂无已验证的当前赛季球队聚合源 | 不把场均数伪装成总数；未核实的字段为空 |
| 球员进球、助攻、点球进球、出场数 | [GOAL API 射手榜](https://goal-api.com/blog/football-stats-api) | 请求明确指定当前赛季；只显示响应实际返回的字段 |
| 球员射门、射正、关键传球、过人、抢断等 | [GOAL API 球员统计端点](https://goal-api.com/documentation) | 当前同步先保留射手榜实际返回的字段；跨指标榜单需验证 API 响应结构后扩展 |

球队、球员的进攻、传控、突破、防守、纪律栏目已搭好；只展示核实来源返回的数字。射正率、射门转化率、传球成功率和过人成功率只在原始分子和分母都可用时计算。GOAL API 官方资料列出球队赛季统计端点，但没有公开固定 JSON 字段规范；同步器先识别有限的已知字段。启用后需检查 Actions 日志和快照中的各联赛球队匹配率，再安全扩展更多指标。

2026 年 10 月 10 日奥格斯堡 2:2 拜仁慕尼黑的快照比分已与[拜仁官网战报](https://fcbayern.com/en/news/matchreports/2026/10/match-report-fc-augsburg-v-fc-bayern-101026)核对。其他比赛不能据此推断全部准确；发现具体错误时应按比赛 ID 对照赛事或俱乐部官方结果，并修正同步快照。Football-Data.org 的 `fullTime` 在点球大战结束时可能包含点球数，程序已将点球从比赛比分中分离并单独标示，依据其[比分说明](https://docs.football-data.org/general/v4/overtime.html)。

## 图片来源

头条配图是 AngusConnaltyPhotos 拍摄的[真实足球比赛照片](https://commons.wikimedia.org/wiki/File:Soccer_match.jpg)，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 授权使用。页面通过 CSS 裁切显示，并在图片所在卡片中署名。该照片仅作新闻示意图，并非演示新闻对应比赛的现场照片。
