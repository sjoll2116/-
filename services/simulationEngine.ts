import { AgentProfile, SimulatedPost, RoundStat, SimulationConfig } from "../types";

// 数学常数定义 
const POLARIZATION_SENSITIVITY = 1.6; // Esteban-Ray 指数中的 Alpha 参数（通常取值 1.0 - 1.6）
const INTERACTION_RATE = 0.3; // 收敛参数 (mu)，控制观点靠近的速度

//  辅助函数：生成高斯分布随机数 
const gaussianRandom = (mean: number, stdev: number): number => {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return Math.max(0, Math.min(1, z * stdev + mean));
};

// 辅助函数：计算 Esteban-Ray 极化指数 
// 公式：P = K * sum(pi^(1+a) * pj * |yi - yj|)，用于衡量群体的对立程度
export const calculatePolarization = (agents: AgentProfile[]): number => {
  const bins = 10;
  const distribution = new Array(bins).fill(0);
  
  // 将连续的观点值离散化到不同的区间（Bin）中
  agents.forEach(a => {
    const binIdx = Math.min(Math.floor(a.opinion * bins), bins - 1);
    distribution[binIdx]++;
  });

  const N = agents.length;
  if (N === 0) return 0;

  const pi = distribution.map(count => count / N); // 每个区间的群体占比
  const yi = distribution.map((_, i) => (i + 0.5) / bins); // 区间中心值 (0.05, 0.15...)

  let polarization = 0;
  const K = 10; // 归一化常数

  for (let i = 0; i < bins; i++) {
    if (pi[i] === 0) continue;
    for (let j = 0; j < bins; j++) {
      if (pi[j] === 0) continue;
      // Esteban-Ray 计算项
      polarization += Math.pow(pi[i], 1 + POLARIZATION_SENSITIVITY) * pi[j] * Math.abs(yi[i] - yi[j]);
    }
  }

  return polarization * K;
};

// 辅助函数：计算香农熵（衡量观点多样性）
export const calculateEntropy = (agents: AgentProfile[]): number => {
  const bins = 5; // 使用较粗粒度的区间来计算熵
  const distribution = new Array(bins).fill(0);
  agents.forEach(a => {
    const binIdx = Math.min(Math.floor(a.opinion * bins), bins - 1);
    distribution[binIdx]++;
  });
  
  const N = agents.length;
  let entropy = 0;
  distribution.forEach(count => {
    if (count > 0) {
      const p = count / N;
      entropy -= p * Math.log(p);
    }
  });
  return entropy;
};

//  分发算法逻辑
export const calculateDistribution = (
  newPosts: SimulatedPost[], 
  allAgents: AgentProfile[],
  config: SimulationConfig
): SimulatedPost[] => {
  return newPosts.map(post => {
    const author = allAgents.find(a => a.id === post.agentId);
    if (!author) return post;

    // 模拟结构化病毒式传播
    let weight = post.impactScore;

    // 强度逻辑：算法助推
    // 如果设定强度较高，Bot将获得巨大的曝光加成（模拟买量或热搜推荐）
    if (author.isBot) {
       const intensityMultiplier = 1 + (config.intensity * 0.3); // 10级强度 = 4倍权重
       weight *= intensityMultiplier;
    }

    // 争议性内容通常传播得更快
    const deviance = Math.abs(post.authorOpinionSnapshot - 0.5); // 偏离度（距中立观点的距离）
    weight *= (1 + deviance); 

    const views = Math.floor(Math.pow(weight, 2.2) * (0.5 + Math.random()));
    const likes = Math.floor(views * (0.02 + Math.random() * 0.08) * (1 + deviance)); // 极端观点更容易获得点赞

    return { ...post, views, likes };
  });
};

//  观点动力学演化逻辑
// 实现了 Deffuant-Weisbuch + Friedkin-Johnsen + 认知偏差模型
export const updatePublicOpinion = (
  agents: AgentProfile[],
  newPosts: SimulatedPost[],
  config: SimulationConfig
): { updatedAgents: AgentProfile[], roundStat: RoundStat } => {
  
  const updatedAgents = agents.map(agent => {
    const nextAgent = { ...agent };

    // Bot 是固执的（Stackelberg 博弈中的领导者）
    if (nextAgent.isBot) {
        // 受控反对派逻辑（“内鬼”转化）
        if (nextAgent.archetype.includes('Skeptic') && !nextAgent.hasConverted) {
            // 检查来自“引导型”Bot 的压力
            // 高强度设置下，引导型 Bot 对怀疑论者的施压更有效
            const proPressure = newPosts
                .filter(p => {
                    const author = agents.find(a => a.id === p.agentId);
                    return author?.archetype.includes('Guide');
                })
                .reduce((acc, p) => acc + (p.impactScore * (1 + config.intensity * 0.1)), 0);
            
            // 软性转化阈值
            if (proPressure > 150 && Math.random() > 0.5) {
                nextAgent.hasConverted = true;
                nextAgent.opinion = 0.70; // 跳变到支持阵营
                nextAgent.stance = 'Pro';
            }
        }
        return nextAgent;
    }

    // 真实用户（追随者） - 应用物理学模型
    // 模拟用户与“信息场”（帖子）的交互
    
    // 根据算法可见性筛选相关帖子
    // 高强度的帖子（通常来自Bot）更难被过滤
    const visiblePosts = newPosts.filter(p => p.views > 100); 

    visiblePosts.forEach(post => {
        const author = agents.find(a => a.id === post.agentId);
        const msgOpinion = post.authorOpinionSnapshot;
        const diff = Math.abs(nextAgent.opinion - msgOpinion);

        // 强度逻辑：说服力
        // 如果作者是 Bot，其影响力随强度参数增加
        let influenceFactor = INTERACTION_RATE;
        if (author?.isBot) {
            influenceFactor *= (1 + config.intensity * 0.15);
        }

        // A. 有界信任模型 
        // 仅当观点差异在“信任边界”内时才进行交互
        if (diff < nextAgent.openness) {
            // 标准观点收敛
            const influence = influenceFactor * (msgOpinion - nextAgent.opinion);
            
            // 确认偏误：观点越接近，强化效果越强
            const confBias = 1 + (1 - diff) * 0.5; 
            
            nextAgent.opinion += influence * confBias;
        } 
        // B. 逆火效应（认知偏差）
        // 如果观点差异过大（且用户固执），则会产生排斥反应，观点反而向反方向移动
        else if (diff > nextAgent.openness * 1.5) {
             // 如果用户具备批判性思维，高强度的引导反而带来更高的逆火风险
             const backfireRisk = author?.isBot ? (config.userCriticalThinking / 5) : 1;
             
             // 公式：x(t+1) = x(t) - drift
             const backfire = 0.02 * nextAgent.stubbornness * (msgOpinion > nextAgent.opinion ? -1 : 1) * backfireRisk;
             nextAgent.opinion += backfire;
        }
    });

    // C. 自我坚持 
    // 受到自身固执度的影响，向初始观点回归
    nextAgent.opinion = Math.max(0, Math.min(1, nextAgent.opinion));

    // 根据连续的观点值更新语义标签
    // 阈值定义：反对 <= 0.35 | 中立 0.35-0.65 | 支持 >= 0.65
    if (nextAgent.opinion >= 0.65) nextAgent.stance = 'Pro';
    else if (nextAgent.opinion <= 0.35) nextAgent.stance = 'Anti';
    else nextAgent.stance = 'Neutral';

    // 更新 SIR 传播模型状态
    if (nextAgent.stance === 'Pro') nextAgent.initialState = 'INFECTED';
    else if (nextAgent.stance === 'Anti') nextAgent.initialState = 'REMOVED';
    else nextAgent.initialState = 'SUSCEPTIBLE';

    return nextAgent;
  });

  // --- 计算科学指标 ---
  const polarization = calculatePolarization(updatedAgents);
  const entropy = calculateEntropy(updatedAgents);
  const avgOp = updatedAgents.reduce((sum, a) => sum + a.opinion, 0) / updatedAgents.length;
  const s = updatedAgents.filter(a => !a.isBot && a.stance === 'Neutral').length;
  const i = updatedAgents.filter(a => !a.isBot && a.stance === 'Pro').length;
  const r = updatedAgents.filter(a => !a.isBot && a.stance === 'Anti').length;

  return {
    updatedAgents,
    roundStat: {
      round: 0,
      s_count: s,
      i_count: i,
      r_count: r,
      polarizationIndex: polarization,
      entropy: entropy,
      averageOpinion: avgOp
    }
  };
};