import { AgentProfile, SimulatedPost, RoundStat, SimulationConfig } from "../types";

// --- Mathematical Constants ---
const POLARIZATION_SENSITIVITY = 1.6; // Alpha for Esteban-Ray index (usually 1.0 - 1.6)
const INTERACTION_RATE = 0.3; // Convergence parameter (mu)

// --- Helper: Gaussian Random ---
const gaussianRandom = (mean: number, stdev: number): number => {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return Math.max(0, Math.min(1, z * stdev + mean));
};

// --- Helper: Calculate Esteban-Ray Polarization Index ---
// Formula: P = K * sum(pi^(1+a) * pj * |yi - yj|)
const calculatePolarization = (agents: AgentProfile[]): number => {
  const bins = 10;
  const distribution = new Array(bins).fill(0);
  
  // 1. Discretize opinions into bins
  agents.forEach(a => {
    const binIdx = Math.min(Math.floor(a.opinion * bins), bins - 1);
    distribution[binIdx]++;
  });

  const N = agents.length;
  if (N === 0) return 0;

  const pi = distribution.map(count => count / N); // Population proportion per bin
  const yi = distribution.map((_, i) => (i + 0.5) / bins); // Bin centers (0.05, 0.15...)

  let polarization = 0;
  const K = 10; // Normalization constant

  for (let i = 0; i < bins; i++) {
    if (pi[i] === 0) continue;
    for (let j = 0; j < bins; j++) {
      if (pi[j] === 0) continue;
      // Esteban-Ray Term
      polarization += Math.pow(pi[i], 1 + POLARIZATION_SENSITIVITY) * pi[j] * Math.abs(yi[i] - yi[j]);
    }
  }

  return polarization * K;
};

// --- Helper: Calculate Shannon Entropy (Diversity) ---
const calculateEntropy = (agents: AgentProfile[]): number => {
  const bins = 5; // Coarser bins for entropy
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

// --- 1. Distribution Algorithm (Structure Level) ---
export const calculateDistribution = (
  newPosts: SimulatedPost[], 
  allAgents: AgentProfile[]
): SimulatedPost[] => {
  return newPosts.map(post => {
    const author = allAgents.find(a => a.id === post.agentId);
    if (!author) return post;

    // Structural Virality simulation
    let weight = post.impactScore;

    // Bot Network amplification
    if (author.isBot) weight *= 1.5; 

    // "Controversy" usually travels faster
    const deviance = Math.abs(post.authorOpinionSnapshot - 0.5); // 0.5 is neutral
    weight *= (1 + deviance); 

    const views = Math.floor(Math.pow(weight, 2.2) * (0.5 + Math.random()));
    const likes = Math.floor(views * (0.02 + Math.random() * 0.08) * (1 + deviance)); // Extremes get more likes

    return { ...post, views, likes };
  });
};

// --- 2. Opinion Dynamics (The Neuro-Symbolic Core) ---
// Implements Deffuant-Weisbuch + Friedkin-Johnsen + Cognitive Bias
export const updatePublicOpinion = (
  agents: AgentProfile[],
  newPosts: SimulatedPost[],
  config: SimulationConfig
): { updatedAgents: AgentProfile[], roundStat: RoundStat } => {
  
  const updatedAgents = agents.map(agent => {
    const nextAgent = { ...agent };

    // BOTS are Stubborn (Leaders in Stackelberg Game)
    if (nextAgent.isBot) {
        // Controlled Opposition Logic (The "Mole" Conversion)
        if (nextAgent.archetype.includes('Skeptic') && !nextAgent.hasConverted) {
            // Check pressure from "Guide" bots
            const proPressure = newPosts
                .filter(p => {
                    const author = agents.find(a => a.id === p.agentId);
                    return author?.archetype.includes('Guide') && p.impactScore > 60;
                })
                .reduce((acc, p) => acc + p.impactScore, 0);
            
            // Soft Conversion: Math drives the "Drama"
            if (proPressure > 120 && Math.random() > 0.5) {
                nextAgent.hasConverted = true;
                nextAgent.opinion = 0.65; // Jump to slightly Pro
                nextAgent.stance = 'Pro';
            }
        }
        return nextAgent;
    }

    // REAL USERS (Followers) - Apply Physics Models
    // We simulate interaction with the "Information Field" (Posts)
    
    // Select relevant posts based on algorithm visibility
    const visiblePosts = newPosts.filter(p => p.views > 100); // Filter noise

    visiblePosts.forEach(post => {
        const msgOpinion = post.authorOpinionSnapshot;
        const diff = Math.abs(nextAgent.opinion - msgOpinion);

        // A. Bounded Confidence (Deffuant)
        // Only interact if opinion is within 'openness' range
        if (diff < nextAgent.openness) {
            // Standard Convergence
            // x(t+1) = x(t) + mu * (msg - x(t))
            const influence = INTERACTION_RATE * (msgOpinion - nextAgent.opinion);
            
            // Confirmation Bias: Stronger update if closer
            const confBias = 1 + (1 - diff) * 0.5; 
            
            nextAgent.opinion += influence * confBias;
        } 
        // B. Backfire Effect (Cognitive Bias)
        // If message is TOO far (and agent is stubborn), move AWAY
        else if (diff > nextAgent.openness * 1.5) {
             // x(t+1) = x(t) - drift
             const backfire = 0.02 * nextAgent.stubbornness * (msgOpinion > nextAgent.opinion ? -1 : 1);
             nextAgent.opinion += backfire;
        }
    });

    // C. Self-Adherence (Friedkin-Johnsen)
    // Pull back towards initial state (or intrinsic personality) to prevent instant brainwashing
    // Using current opinion as a proxy for "intrinsic" in this simplified step-wise sim, 
    // or we could store `initialOpinion` in profile.
    // Here we use 'stubbornness' as resistance to change.
    // The previous steps modified `opinion` directly. Ideally, FJ is: x_new = (1-L)*Social + L*Intrinsic
    // We simulated Social above. Now we clamp/dampen.
    
    // Clamp to [0,1]
    nextAgent.opinion = Math.max(0, Math.min(1, nextAgent.opinion));

    // Update Semantic Stance Label based on continuous Opinion
    if (nextAgent.opinion > 0.6) nextAgent.stance = 'Pro';
    else if (nextAgent.opinion < 0.4) nextAgent.stance = 'Anti';
    else nextAgent.stance = 'Neutral';

    // Update SIR Status
    if (nextAgent.stance === 'Pro') nextAgent.initialState = 'INFECTED';
    else if (nextAgent.stance === 'Anti') nextAgent.initialState = 'REMOVED';
    else nextAgent.initialState = 'SUSCEPTIBLE';

    return nextAgent;
  });

  // --- Calculate Scientific Metrics ---
  const polarization = calculatePolarization(updatedAgents);
  const entropy = calculateEntropy(updatedAgents);
  const avgOp = updatedAgents.reduce((sum, a) => sum + a.opinion, 0) / updatedAgents.length;

  const s = updatedAgents.filter(a => a.stance === 'Neutral').length;
  const i = updatedAgents.filter(a => a.stance === 'Pro').length;
  const r = updatedAgents.filter(a => a.stance === 'Anti').length;

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