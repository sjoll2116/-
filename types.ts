export enum StrategyType {
  FOMO_INDUCTION = 'FOMO_INDUCTION',
  LOGICAL_PERSUASION = 'LOGICAL_PERSUASION',
  EMOTIONAL_APPEAL = 'EMOTIONAL_APPEAL',
  CONTROVERSY_GENERATION = 'CONTROVERSY_GENERATION',
  MEMETIC_WARFARE = 'MEMETIC_WARFARE'
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
  
  // --- Neuro-Symbolic Core Attributes ---
  stance: 'Pro' | 'Anti' | 'Neutral'; // Semantic Label
  opinion: number; // Continuous value [0.0, 1.0]. 0=Anti, 1=Pro.
  
  // Cognitive Parameters (Based on Deffuant & FJ Models)
  openness: number; // epsilon: Confidence Bound. Only interact if |op_i - op_j| < epsilon
  stubbornness: number; // lambda: Self-adherence weight. 1 = Fully stubborn.
  
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
  
  // Snapshot of author's opinion at time of posting
  authorOpinionSnapshot: number;
}

export interface RoundStat {
  round: number;
  s_count: number;
  i_count: number;
  r_count: number;
  // Advanced Metrics
  polarizationIndex: number; // Esteban-Ray Index
  entropy: number; // Shannon Entropy
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

export interface SimulationConfig {
  topic: string;
  productOrObjective: string;
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