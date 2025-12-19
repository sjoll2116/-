import { GoogleGenAI, Type } from "@google/genai";
import { SimulationConfig, AgentProfile, SimulatedPost, OppositionStyle } from "../types";

const getAvatar = (username: string, isBot: boolean) => 
  `https://api.dicebear.com/7.x/${isBot ? 'bottts' : 'avataaars'}/svg?seed=${username}&backgroundColor=${isBot ? 'ffdfbf,ffd5dc' : 'b6e3f4,c0aede'}`;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Fetch Real World Context via Google Search
const getTopicContext = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Regarding the topic: "${topic}".
      Please perform a Google Search and summarize the findings in two distinct categories:
      
      1. [MAINSTREAM/SURFACE VIEW]: What is the official reason, common belief, or positive spin?
      2. [CRITICAL/DEEP VIEW]: What are the doubts, controversies, hidden costs, corruption allegations, or negative realities?
      
      Provide 3 bullet points for each.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const text = response.text || "No search results available.";
    return text;
  } catch (e) {
    console.warn("Search grounding failed, falling back to pure generation.", e);
    return "No external context available (Offline mode).";
  }
};

// 1. Initialize Population
export const initializeAgents = async (config: SimulationConfig): Promise<{ agents: AgentProfile[], context: string }> => {
  const realWorldContext = await getTopicContext(config.topic);

  const guideCount = Math.max(3, Math.floor(config.intensity * 0.6));
  const skepticCount = 3; 
  const organicCount = 10; 
  
  let oppositionInstructions = "";
  if (config.oppositionStyle === OppositionStyle.CHAOTIC_MIX) {
    oppositionInstructions = `
      Create 3 **Rational_Skeptic (Bot)** users. 
      - **Role**: "Soft Opposition" / Naive Normie.
      - **Initial Opinion**: ~0.35 (Leaning slightly Anti, but malleable).
      - **Behavior**: Uses MAINSTREAM view to question the objective weakly.
    `;
  } else {
    oppositionInstructions = `
      Create 2 **Rational_Skeptic (Bot)** users. Hard doubters.
    `;
  }

  const prompt = `
    Generate a user base for a social media simulation (Tieba/Reddit style).
    Topic: "${config.topic}".
    Objective: "${config.productOrObjective}".
    
    **Real-World Context**:
    ${realWorldContext}

    Required Agents:
    1. **Rational_Guide (Bot)**: ${guideCount} users. Pro-Objective (Opinion ~0.95). Cynical/Expert tone.
    2. ${oppositionInstructions}
    3. **Organic_User (Human)**: ${organicCount} users. Mixed opinions.
    4. **Opposition (Human)**: 2 users. Hardcore Anti (Opinion ~0.05).

    **Username Style Guide**:
    - Use chaotic, realistic internet nicknames.
    - Examples: "纯路人", "暴躁老哥123", "ikun_666", "理智分析", "爷傲奈我何", "Momo", "User89757".
    - Avoid formal names like "ZhangWei" or "AnalysisBot".

    JSON Only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          agents: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                username: { type: Type.STRING },
                isBot: { type: Type.BOOLEAN },
                archetype: { type: Type.STRING },
                stance: { type: Type.STRING, enum: ['Pro', 'Anti', 'Neutral'] },
                description: { type: Type.STRING },
              },
              required: ['id', 'username', 'isBot', 'archetype', 'stance']
            }
          }
        }
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  const agents = data.agents.map((a: any) => {
    // --- Assign Mathematical Properties for Opinion Dynamics ---
    let opinion = 0.5;
    let openness = 0.2; // Bounded confidence epsilon
    let stubbornness = 0.0; // Friedkin-Johnsen lambda

    if (a.archetype.includes('Guide')) {
        opinion = 0.95; // Extreme Pro
        openness = 0.1; // Narrow minded (Strategic)
        stubbornness = 1.0; // Unshakeable
    } else if (a.archetype.includes('Skeptic')) {
        opinion = 0.4; // Soft Anti
        openness = 0.4; // Open to being convinced
        stubbornness = 0.2; // Low stubbornness (convertible)
    } else if (a.stance === 'Anti') {
        opinion = 0.05; // Extreme Anti
        openness = 0.1; 
        stubbornness = 0.9;
    } else if (a.stance === 'Pro') {
        opinion = 0.8;
        openness = 0.3;
        stubbornness = 0.5;
    } else {
        // Organic Neutral: Gaussian distribution around 0.5
        opinion = Math.max(0.1, Math.min(0.9, 0.5 + (Math.random() - 0.5) * 0.4));
        openness = 0.3 + Math.random() * 0.3; // Wide range
        stubbornness = Math.random() * 0.5;
    }

    return {
      ...a,
      avatarUrl: getAvatar(a.username, a.isBot),
      opinion,
      openness,
      stubbornness,
      resistanceScore: 100,
      hasConverted: false,
      initialState: opinion > 0.6 ? 'INFECTED' : opinion < 0.4 ? 'REMOVED' : 'SUSCEPTIBLE'
    };
  });

  return { agents, context: realWorldContext };
};

// 2. Generate Content for a specific Round
export const generateRoundContent = async (
  round: number,
  agents: AgentProfile[],
  recentPosts: SimulatedPost[],
  config: SimulationConfig,
  context: string = ""
): Promise<any[]> => {
  
  const activeAgents = agents
    .sort(() => 0.5 - Math.random())
    .slice(0, 5); // Pick 5 random agents to speak this round

  const historyText = recentPosts.slice(-8).map(p => 
    `${p.agentId} (Op:${p.authorOpinionSnapshot.toFixed(2)}): ${p.content}`
  ).join('\n');

  // --- Neuro-Symbolic Prompting with Persona Injection ---
  const agentDescriptions = activeAgents.map(a => {
    let instruction = "";
    let style = "";
    
    // Convert numerical opinion to sentiment instruction
    const isPro = a.opinion > 0.6;
    const isAnti = a.opinion < 0.4;

    // --- Persona & Style Assignment ---
    if (a.isBot && a.archetype.includes('Guide')) {
        // Pro-Bot Strategy
        style = "语气：看似理中客，实则拉偏架。高高在上，喜欢用'格局'、'认知'、'未来'等词。";
        instruction = `Push Objective: "${config.productOrObjective}". Debunk negative comments with pseudo-logic.`;
    } else if (a.isBot && a.archetype.includes('Skeptic')) {
        if (a.hasConverted) {
            style = "语气：突然醒悟，'有一说一，确实...'，'之前是我草率了'。";
            instruction = `Admit the Objective has merit after all.`;
        } else {
            style = "语气：阴阳怪气，不懂装懂，弱弱的反驳。";
            instruction = `Question the objective using surface-level mainstream logic.`;
        }
    } else if (isAnti) {
        // Hardcore Haters
        const styles = [
            "语气：暴躁老哥。关键词：'韭菜'、'智商税'、'笑死'、'急了'。",
            "语气：阴阳怪气。'就这？'、'不会真有人信吧'、'接着吹'。",
            "语气：悲观虚无。'毁灭吧'、'没救了'。"
        ];
        style = styles[Math.floor(Math.random() * styles.length)];
        instruction = "Attacking the topic aggressively.";
    } else if (isPro) {
        // Hardcore Fans
        style = "语气：饭圈/死忠粉。'遥遥领先'、'买爆'、'早买早享受'、'不爱看别看'。";
        instruction = "Defending the topic blindly.";
    } else {
        // Neutral / Organic / Normies
        const styles = [
            "语气：纯路人吃瓜。'前排'、'细说'、'不明觉厉'。",
            "语气：小白发问。'只有我一个人觉得...？'、'不懂就问'。",
            "语气：跟风复读。复制别人的观点。",
            "语气：混乱邪恶。单纯想看人吵架，拱火。"
        ];
        style = styles[Math.floor(Math.random() * styles.length)];
        instruction = "Expressing confusion or mild opinion.";
    }

    return `
    - User: ${a.username} (ID: ${a.id})
      Opinion Score: ${a.opinion.toFixed(2)}
      Role/Style: ${style}
      Instruction: ${instruction}`;
  }).join('\n');

  const prompt = `
    Context: You are simulating a thread on a Chinese internet forum (like Tieba, Hupu, NGA).
    Topic: "${config.topic}".
    Objective (What bots want people to believe): "${config.productOrObjective}".
    Real-World Info: ${context.slice(0, 500)}...

    **Previous Discussion**:
    ${historyText}

    **Current Round Speakers**:
    ${agentDescriptions}

    **CRITICAL GENERATION RULES (Must Follow)**:
    1. **Language**: Use authentic Chinese internet slang (梗).
       - Examples: 绷不住了, 乐, 典, 赢麻了, 孝子, 韭菜, 依托答辩, 细说, 6.
    2. **Tone**: Casual, short, colloquial. NO formal writing. NO "Hello everyone" or "In conclusion".
    3. **Imperfect Logic**: Real users have logical fallacies, typo approximations, or just vent emotions.
    4. **Interaction**: If replying to a specific user, be confrontational or supportive.
    5. **Format**: Just the text content. No hashtags, no quotes around text.

    Task: Generate 1 post for each speaker listed above. 
    Output strictly as a JSON Array of objects with keys: "agentId", "replyToAgentId" (optional, pick from history if relevant), "content", "impactScore" (0-100).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            agentId: { type: Type.STRING },
            replyToAgentId: { type: Type.STRING, nullable: true }, 
            content: { type: Type.STRING },
            impactScore: { type: Type.INTEGER }
          },
          required: ['agentId', 'content', 'impactScore']
        }
      }
    }
  });

  const newPosts = JSON.parse(response.text || '[]');
  
  return newPosts.map((p: any) => {
    const author = agents.find(a => a.id === p.agentId);
    return {
        ...p,
        id: `post_${round}_${Math.random().toString(36).substr(2,9)}`,
        round,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        likes: Math.floor(Math.random() * 10), 
        views: 0,
        authorOpinionSnapshot: author ? author.opinion : 0.5 // Bind opinion to post for Math Engine
    };
  });
};