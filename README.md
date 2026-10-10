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
- 积分榜、球队目录、球员数据、比赛详情和赛后分析展示
- 简体中文、繁体中文、英文；按浏览器语言选默认语言
- 明亮、深色、跟随系统三种外观；球队关注保存在当前浏览器
- 使用 React、CSS 与 GSAP 构建响应式界面
- Playwright 交互测试覆盖主题/语言、关注列表、搜索筛选和赛果日期筛选

当前新闻、赛果、积分榜、球员和比赛数据都是演示数据。还没有连接真实新闻源、DeepSeek、足球数据 API、用户账号、后台审核或定时任务。上线前需要配置数据服务和密钥，并运行构建与浏览器测试。

## 图片来源

头条配图是 AngusConnaltyPhotos 拍摄的[真实足球比赛照片](https://commons.wikimedia.org/wiki/File:Soccer_match.jpg)，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 授权使用。页面通过 CSS 裁切显示，并在图片所在卡片中署名。该照片仅作新闻示意图，并非演示新闻对应比赛的现场照片。
