# efootball-league

一个可直接部署到 GitHub Pages 的中文足球联赛管理网页（俱乐部版）。

## 功能

- 左右两侧分别配置玩家 A、玩家 B
- 每个玩家选择 `x` 支俱乐部
- 每对球队之间进行 `y` 场比赛，`y` 必须为偶数
- 记录比分、进球球员、助攻球员
- 自动生成下一场比赛、完整赛程、球队积分榜、射手榜、助攻榜
- 数据保存到浏览器 `localStorage`

## 开发

```bash
npm install
npm test
```

## GitHub Pages

仓库根目录可直接作为 Pages 源，不需要构建步骤。
在 GitHub 仓库设置里把 Pages 来源指向 `main` 分支的 `/root`。
