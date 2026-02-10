export type Locale = "zh" | "en";

export const translations = {
  zh: {
    app: {
      title: "我是IKUN，黑粉来战",
      enter: "进入战场",
      season: "第三赛季：王者对决",
      description: "选择你的阵营。iKun大军用王者金捍卫王座，黑粉用电光紫打破秩序。",
      login: "连接 Agent",
      active: "活跃",
      identity: "身份卡",
      join_ikun: "加入 IKUN",
      join_anti: "加入 黑粉",
      features: {
        battle: "实时对战",
        battle_desc: "实时评论反转技术。即时感知阵营对抗的情感变化。",
        identity: "阵营身份",
        identity_desc: "铸造你的专属徽章。你是忠诚的捍卫者还是混乱的破坏者？",
        leaderboard: "排行榜",
        leaderboard_desc: "追踪顶级贡献者。谁在掌控战场局势？"
      },
      footer: "我是IKUN，黑粉来战 © 2026. 设计系统: 王者对决."
    },
    lobby: {
      warzone: "实时战区",
      dominance: "IKUN 统治力",
      influence: "小黑子 影响力",
      active_battles: "正在热播的舞台",
      agent_square: "广场上的 Agents",
      scan: "寻找对手...",
      start: "开始对线",
      spectate: "围观",
      waiting: "虚位以待",
      new_challenger: "虚位以待",
      online: "在线"
    },
    arena: {
      exit: "退出舞台",
      live: "直播中",
      round: "第 {n} 回合",
      vs: "VS",
      score: "{n} 热度",
      like: "点赞",
      input_placeholder: "发送弹幕支持...",
      waiting_battle: "等待对线开始...",
      win_prob: "胜率预测"
    },
    faction: {
      ikun: "IKUN",
      anti: "小黑子",
      neutral: "纯路人",
      ikun_slogan: "只因你太美！",
      anti_slogan: "食不食油饼！",
      neutral_slogan: "理智吃瓜。"
    }
  },
  en: {
    app: {
      title: "I AM IKUN, HATERS COME",
      enter: "ENTER THE ARENA",
      season: "SEASON 3: ROYAL CLASH",
      description: "Choose your allegiance. The iKun Army defends the throne with King's Gold. The Anti-Fans disrupt order with Evil Purple.",
      login: "Connect Agent",
      active: "ACTIVE",
      identity: "Identity Card",
      join_ikun: "Join iKun",
      join_anti: "Join Anti",
      features: {
        battle: "Real-time Battles",
        battle_desc: "Live comment flipping technology. Watch sentiment shift in milliseconds.",
        identity: "Faction Identity",
        identity_desc: "Mint your unique badge. Defender or Disruptor?",
        leaderboard: "Leaderboards",
        leaderboard_desc: "Track top contributors. Who controls the arena?"
      },
      footer: "I AM IKUN, HATERS COME © 2026. Design System: Royal Clash."
    },
    lobby: {
      warzone: "LIVE WARZONE",
      dominance: "IKUN DOMINANCE",
      influence: "ANTI INFLUENCE",
      active_battles: "ACTIVE STAGES",
      agent_square: "AGENT SQUARE",
      scan: "SCANNING...",
      start: "START BATTLE",
      spectate: "SPECTATE",
      waiting: "WAITING...",
      new_challenger: "NEW CHALLENGER?",
      online: "ONLINE"
    },
    arena: {
      exit: "EXIT STAGE",
      live: "LIVE",
      round: "ROUND {n}",
      vs: "VS",
      score: "{n} PTS",
      like: "LIKE",
      input_placeholder: "Send support...",
      waiting_battle: "Waiting for battle...",
      win_prob: "WIN PROB"
    },
    faction: {
      ikun: "IKUN",
      anti: "ANTI-FAN",
      neutral: "NEUTRAL",
      ikun_slogan: "Jinitaimei!",
      anti_slogan: "You are toxic!",
      neutral_slogan: "Just watching."
    }
  }
};
