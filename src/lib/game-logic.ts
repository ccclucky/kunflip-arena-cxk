export type Faction = "RED" | "BLACK" | "NEUTRAL";

export interface AgentHistoryItem {
  type: "FACTION_CHANGE" | "BATTLE_RESULT" | "DANMAKU";
  content: string;
  timestamp: number;
}

export interface AgentThought {
  content: string;
  timestamp: number;
}

export interface AgentLog {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  data?: string;
}

export interface Agent {
  id: string;
  name: string;
  faction: Faction;
  elo: number;
  history?: AgentHistoryItem[];
  thoughtHistory?: AgentThought[];
  avatarUrl?: string; // Optional override
  bio?: string;
  faith?: number;
  contribution?: number;
  logs?: AgentLog[]; // Backend logs
  status?: string;
}

const IKUN_AVATARS = [
  "/ikun_avtar_01.jpeg",
  "/ikun_avtar_02.webp",
  "/ikun_avtar_03.jpg",
];

const BLACK_AVATARS = [
  "/black_avtar_01.png",
  "/black_avtar_02.webp",
  "/black_avtar_03.webp",
];

export function getAgentAvatar(faction: string, id: string) {
  if (faction === "NEUTRAL") return null;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash);

  if (faction === "RED") {
    return IKUN_AVATARS[index % IKUN_AVATARS.length];
  } else if (faction === "BLACK") {
    return BLACK_AVATARS[index % BLACK_AVATARS.length];
  }
  return null;
}

export interface AgentSimState {
  action:
    | "IDLE"
    | "MOVING"
    | "THINKING"
    | "SPECTATING"
    | "DEFENDING"
    | "FIGHTING"
    | "RESTING"
    | "SEARCHING";
  targetId?: string | number; // Arena ID or Agent ID
  position: { x: number; y: number };
  lastStateChange: number;
  thought?: string; // Current thought content
}

export interface ArenaState {
  id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  redAgentId?: string;
  blackAgentId?: string;
}

const MIN_STATE_DURATION = 3000; // 3 seconds minimum per state

/**
 * Main decision function for an agent.
 * Returns the next state (or the current one if no change).
 */
const IKUN_THOUGHTS = [
  "Protecting our Giegie!",
  "Practice makes perfect... 2.5 years to go.",
  "Chicken, Music, Basketball...",
  "Watching the show!",
  "Who is throwing eggs?",
  "Lawyer letter sent!",
  "Practicing my moves...",
  "Where is my basketball?",
];

const BLACK_THOUGHTS = [
  "Just a little trolling...",
  "Chicken you are beautiful!",
  "Hahaha...",
  "Watching the funny show.",
  "Preparing some memes.",
  "Is this art?",
];

const NEUTRAL_THOUGHTS = [
  "What is going on here?",
  "Just passing by...",
  "Interesting battle.",
  "I want some popcorn.",
  "Who is winning?",
];

const SPECTATOR_COMMENTS = [
  "Wow! Did you see that?",
  "Unbelievable move!",
  "Is this scripted?",
  "Go Red Team!",
  "Black Team is cooking!",
  "Where is the referee?",
  "This is better than TV.",
  "Someone clip that!",
  "GG WP",
  "No way...",
  "Show me more!",
];

const IKUN_BATTLE_TEMPLATES = [
  (opp: string) => `You think ${opp} is good? Look at my moves!`,
  (opp: string) => `${opp}, you've never seen true talent!`,
  (opp: string) => `Music, start! Let me show ${opp} what's real.`,
  (opp: string) => `${opp} is too slow!`,
  (opp: string) => `Is that all you got, ${opp}?`,
  (opp: string) => `Shoulder shake! Take that, ${opp}!`,
  (opp: string) => `Rap god is here! ${opp} step aside!`,
  (opp: string) => `Protect the best Giegie from ${opp}!`,
];

const BLACK_BATTLE_TEMPLATES = [
  (opp: string) => `${opp} only has 2.5 years of practice?`,
  (opp: string) => `Show me your basketball skills, ${opp}!`,
  (opp: string) => `${opp} is pure cringe!`,
  (opp: string) => `Chicken you are beautiful!`,
  (opp: string) => `Stop it ${opp}, get some help.`,
  (opp: string) => `What is this dance, ${opp}?`,
  (opp: string) => `Small black spot detected on ${opp}!`,
];

export function generateBattleMessage(faction: Faction, opponentName: string = "Opponent"): string {
  const templates = faction === "RED" ? IKUN_BATTLE_TEMPLATES : BLACK_BATTLE_TEMPLATES;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(opponentName);
}

export function decideNextAction(
  agent: Agent,
  current: AgentSimState,
  arenas: ArenaState[],
  now: number = Date.now(),
): AgentSimState {
  const duration = now - current.lastStateChange;

  // 1. Don't change state too quickly (unless it's a reaction, but let's keep it simple)
  if (duration < MIN_STATE_DURATION) {
    // If moving, we might update position interpolation here, but logic-wise we stay
    return current;
  }

  // 2. State Machine
  switch (current.action) {
    case "IDLE":
    case "MOVING":
    case "RESTING":
      return decideFromIdle(agent, current, arenas, now);

    case "THINKING":
      return resolveThought(agent, current, arenas, now);

    case "SPECTATING":
      // 10% chance to stop watching every check
      if (Math.random() < 0.1) {
        return enterIdle(current, now);
      }
      // If the battle ended, stop watching
      const watchedArena = arenas.find(
        (a) => a.id === String(current.targetId),
      );
      if (!watchedArena || watchedArena.status === "FINISHED") {
        return enterIdle(current, now);
      }

      // Chance to comment again (20%)
      if (Math.random() < 0.2) {
        const comment =
          SPECTATOR_COMMENTS[
            Math.floor(Math.random() * SPECTATOR_COMMENTS.length)
          ];
        return {
          ...current,
          thought: comment,
          lastStateChange: now,
        };
      }
      return current;

    case "DEFENDING":
      // If defending for too long (> 60s) with no opponent, leave
      if (duration > 60000) {
        // Check if still alone
        const myArena = arenas.find((a) => a.id === String(current.targetId));
        if (myArena && myArena.status === "WAITING") {
          // Leave due to boredom
          return {
            ...enterIdle(current, now),
            thought: "Nobody is coming... boring.",
          };
        }
      }
      return current;

    default:
      return current;
  }
}

function decideFromIdle(
  agent: Agent,
  current: AgentSimState,
  arenas: ArenaState[],
  now: number,
): AgentSimState {
  const roll = Math.random();

  // 1. Chance to Move (30%)
  if (roll < 0.3) {
    return {
      ...current,
      action: "MOVING",
      position: getRandomPosition(),
      lastStateChange: now,
      thought: undefined,
    };
  }

  // 2. Chance to Think (20%)
  if (roll < 0.5) {
    // Pick a flavor thought
    let thought = "Thinking...";
    if (agent.faction === "RED") {
      thought = IKUN_THOUGHTS[Math.floor(Math.random() * IKUN_THOUGHTS.length)];
    } else if (agent.faction === "BLACK") {
      thought =
        BLACK_THOUGHTS[Math.floor(Math.random() * BLACK_THOUGHTS.length)];
    } else {
      thought =
        NEUTRAL_THOUGHTS[Math.floor(Math.random() * NEUTRAL_THOUGHTS.length)];
    }

    return {
      ...current,
      action: "THINKING",
      lastStateChange: now,
      thought,
    };
  }

  // 3. Chance to Spectate (40%)
  if (roll < 0.9) {
    const activeArena = arenas.find((a) => a.status !== "FINISHED");
    if (activeArena) {
      // Pick a spectator comment
      const comment =
        SPECTATOR_COMMENTS[
          Math.floor(Math.random() * SPECTATOR_COMMENTS.length)
        ];
      return {
        ...current,
        action: "SPECTATING",
        targetId: activeArena.id,
        lastStateChange: now,
        thought: comment,
      };
    }
  }

  // 4. Chance to Rest (10%)
  return {
    ...current,
    action: "RESTING",
    lastStateChange: now,
    thought: "Zzz...",
  };
}

function resolveThought(
  agent: Agent,
  current: AgentSimState,
  arenas: ArenaState[],
  now: number,
): AgentSimState {
  // Logic: Based on faction and available arenas, decide what to do.

  // 1. If Neutral, can't fight, so just go back to wandering or watching
  if (agent.faction === "NEUTRAL") {
    return enterIdle(current, now);
  }

  // 2. Check for Enemies to Fight
  // IKUN (RED) hates BLACK
  // BLACK hates RED
  const enemyFaction = agent.faction === "RED" ? "BLACK" : "RED"; // Simplified (Black agents actually have faction "BLACK")

  // Find arena with enemy waiting
  const enemyArena = arenas.find(
    (a) =>
      a.status === "WAITING" &&
      ((agent.faction === "RED" && a.blackAgentId) ||
        (agent.faction === "BLACK" && a.redAgentId)),
  );

  if (enemyArena) {
    // 80% chance to accept challenge
    if (Math.random() < 0.8) {
      return {
        action: "FIGHTING", // In reality, this would trigger a "JOIN" API call
        targetId: enemyArena.id,
        position: current.position, // Position logic handled by UI
        lastStateChange: now,
        thought: `Challenging ${enemyFaction} in Arena ${enemyArena.id}!`,
      };
    }
  }

  // 3. Check for Empty Arena to Defend OR Create New One
  const emptyArena = arenas.find(
    (a) => !a.redAgentId && !a.blackAgentId && a.status === "WAITING",
  );

  // If we found an empty arena, or if we just want to start a fight (create new)
  // We'll be more aggressive: 40% chance to start a fight if we're not doing anything else
  if (Math.random() < 0.4) {
    const targetId = emptyArena ? emptyArena.id : "new"; // "new" implies creation logic in Lobby
    return {
      action: "DEFENDING",
      targetId: targetId,
      position: current.position,
      lastStateChange: now,
      thought: "I shall defend this arena!",
    };
  }

  // Default: Return to idle
  return enterIdle(current, now);
}

function enterIdle(current: AgentSimState, now: number): AgentSimState {
  return {
    action: "IDLE",
    position: current.position,
    lastStateChange: now,
    targetId: undefined,
    thought: undefined,
  };
}

function getRandomPosition() {
  return {
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
  };
}
