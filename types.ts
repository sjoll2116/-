export enum StrategyType {
  FOMO_INDUCTION = 'FOMO_INDUCTION',
  LOGICAL_PERSUASION = 'LOGICAL_PERSUASION',
  EMOTIONAL_APPEAL = 'EMOTIONAL_APPEAL',
  CONTROVERSY_GENERATION = 'CONTROVERSY_GENERATION'
}

export enum OppositionStyle {
  NONE = 'NONE', 
  RATIONAL_DEBATE = 'RATIONAL_DEBATE',
  FALSE_FLAG = 'FALSE_FLAG',
  CHAOTIC_MIX = 'CHAOTIC_MIX'
}

export type SIRState = 'SUSCEPTIBLE' | 'INFECTED' | 'REMOVED';

export interface AgentProfile {
  id: string;
  username: string;
  avatarUrl: string;
  isBot: boolean; 
  archetype: string; 
  
  // 神经符号核心属性
  stance: 'Pro' | 'Anti' | 'Neutral'; // 语义标签
  opinion: number; // 连续值 [0.0, 1.0]. 0=反对, 1=支持
  
  // 认知参数 (基于 Deffuant & FJ 模型)
  openness: number; // 信任边界 (epsilon)，只与观点相近的人交互
  stubbornness: number; // 固执度 (lambda)，自我坚持的权重
  
  description: string;
  hasConverted: boolean; 
  initialState: SIRState;
}

export interface SimulatedPost {
  id: string;
  agentId: string;
  replyToId?: string;
  replyToAgentId?: string;
  content: string;
  likes: number;
  views: number; 
  impactScore: number; 
  round: number;
  timestamp: string;
  imageUrl?: string;
  
  // 发帖时作者观点的快照，用于算法计算
  authorOpinionSnapshot: number;
}

export interface RoundStat {
  round: number;
  s_count: number;
  i_count: number;
  r_count: number;
  // 高级指标
  polarizationIndex: number; // 极化指数
  entropy: number; // 信息熵
  averageOpinion: number;
}

export interface SimulationState {
  agents: AgentProfile[];
  posts: SimulatedPost[];
  round: number;
  isRunning: boolean;
  stats: RoundStat[];
  semanticDrift: { term: string, drift: string }[];
  realWorldContext?: string; 
}

// --- 爬虫后端数据契约 (适配文档更新) ---

export interface RealCommentData {
  id: string;              // 评论ID
  userid: string;          // 用户ID
  nickname: string;        // 用户昵称
  content: string;         // 评论内容
  parent_id: string | null;// 父评论ID (文档定义)
  
  // 可选字段 (文档接口未强制要求，但保留以防后端透传或用于前端显示)
  like_count?: number;
  create_time?: number;
  avatar?: string;
}

export interface CrawlerResponse {
  id: string;              // 帖子ID
  title: string;
  desc: string;            // 主楼内容
  userid: string;          // 楼主ID
  nickname: string;        // 楼主昵称
  platform: string;        // 平台
  comments: RealCommentData[];
}

export interface SimulationConfig {
  topic: string;
  productOrObjective: string;
  additionalInfo?: string;
  
  // 外部数据源配置
  sourceUrl?: string;     // 目标帖子链接 (如微博/小红书URL)

  strategy: StrategyType;
  intensity: number;
  oppositionStyle: OppositionStyle;
  userCriticalThinking: number;
}

export interface SimulationAnalysis {
  dominatingSentiment: string;
  effectivenessScore: number;
  narrativeSummary: string;
  sirStats: RoundStat[];
  semanticDrift: { term: string, drift: string }[];
}

export interface SimulationResult {
  agents: AgentProfile[];
  posts: SimulatedPost[];
  analysis: SimulationAnalysis;
}