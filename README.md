# efootball-league

一个可直接部署到 GitHub Pages 的中文足球联赛管理网页（俱乐部版）。

> 在线预览：https://se6het.github.io/efootball-club/

## 功能

- 左右两侧分别配置玩家 A、玩家 B
- 每个玩家选择 `x` 支俱乐部
- 每对球队之间进行 `y` 场比赛，`y` 必须为偶数
- 记录比分、进球球员、助攻球员以及红黄牌球员
- 三张黄牌停赛一场，一张红牌停赛一场，下一场比赛会显示停赛提醒
- 赛程按半程随机分布；每个半程结束时所有球队已进行的比赛场次相同，单轮允许球队轮空
- 数据保存到浏览器 `localStorage`

## 开发

```bash
npm install
npm test
```

## GitHub Pages

仓库根目录可直接作为 Pages 源，不需要构建步骤。
在 GitHub 仓库设置里把 Pages 来源指向 `main` 分支的 `/ (root)`。
