import { GoogleGenAI, Type } from "@google/genai";
import { SimulationConfig, AgentProfile, SimulatedPost, OppositionStyle, CrawlerResponse, RealCommentData, StrategyType } from "../types";

// 更新为文档指定的端口 8080
const CRAWLER_BASE_URL = "http://localhost:8080";

// 生成用户头像，如果是Bot则使用不同的随机种子和背景色
const getAvatar = (username: string, isBot: boolean, realAvatar?: string) => {
    if (realAvatar && realAvatar.startsWith('http')) return realAvatar;
    return `https://api.dicebear.com/7.x/${isBot ? 'bottts' : 'avataaars'}/svg?seed=${username}&backgroundColor=${isBot ? 'ffdfbf,ffd5dc' : 'b6e3f4,c0aede'}`;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 辅助函数：通过谷歌搜索获取话题的现实世界背景
const getTopicContext = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

// 辅助函数：根据 URL 自动检测平台
const detectPlatform = (url: string): string => {
  if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) return "xhs";
  if (url.includes("tieba.baidu.com")) return "tieba";
  if (url.includes("weibo.com")) return "weibo";
  return "tieba"; // 默认回退
};

// 辅助函数：调用本地爬虫接口获取真实帖子数据 (Start -> Poll -> Fetch 流程)
const fetchCrawlerData = async (apiBase: string, sourceUrl: string): Promise<CrawlerResponse | null> => {
    try {
        const platform = detectPlatform(sourceUrl);
        console.log(`Detected platform: ${platform} for URL: ${sourceUrl}`);

        // 1. 启动爬取任务 (POST)
        if (sourceUrl) {
            try {
                const startUrl = `${apiBase}/api/crawler/start`;
                console.log(`Starting crawler task: ${startUrl}`);
                
                const startResponse = await fetch(startUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        platform: platform,
                        crawler_type: "detail",
                        specified_ids: sourceUrl,
                        save_option: "json"
                    })
                });

                if (!startResponse.ok) {
                    console.warn(`Crawler start failed with status: ${startResponse.status}`);
                } else {
                    console.log("Crawler task started successfully. Beginning polling...");
                    
                    // 2. 轮询状态 (Wait for Idle)
                    let isReady = false;
                    let retries = 0;
                    const maxRetries = 30; // 轮询30次 * 2秒 = 60秒超时

                    while (!isReady && retries < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
                        
                        try {
                            const statusResponse = await fetch(`${apiBase}/api/crawler/status`);
                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json();
                                // 根据说明：返回 "idle" 表示就绪
                                // 兼容可能的 JSON 结构 { status: "idle" } 或直接字符串
                                console.log("Crawler status check:", statusData);
                                
                                const currentStatus = typeof statusData === 'string' ? statusData : statusData?.status;
                                
                                if (currentStatus === 'idle') {
                                    isReady = true;
                                    console.log("Crawler is idle/ready.");
                                }
                            }
                        } catch (e) {
                            console.warn("Status check failed, retrying...", e);
                        }
                        retries++;
                    }
                    
                    if (!isReady) {
                        console.warn("Crawler polling timed out or status check failed. Proceeding to try fetching result anyway...");
                    }
                }
            } catch (e) {
                console.warn("Failed to trigger crawler task logic", e);
            }
        }

        // 3. 获取 Adapter 结果 (核心接口)
        const targetUrl = new URL(`${apiBase}/api/adapter/latest-result`);
        targetUrl.searchParams.append("platform", platform);

        console.log(`Fetching latest result from adapter: ${targetUrl.toString()}`);

        const res = await fetch(targetUrl.toString());
        if(!res.ok) throw new Error(`Crawler API Network Error: ${res.statusText}`);
        
        const data = await res.json() as CrawlerResponse;
        
        // 校验返回数据是否包含必要的字段 (id 和 desc/title)
        if (data && (data.desc || data.title)) {
            // 确保 platform 字段正确
            if (!data.platform) data.platform = platform;
            return data; 
        }
        
        console.warn("爬虫返回的数据格式不符合预期", data);
        return null;
    } catch (e) {
        console.error("抓取真实数据全流程失败:", e);
        return null;
    }
}

// 实现逻辑：将真实数据转换为模拟器所需的Agent和Post对象
const initializeFromRealData = (realData: CrawlerResponse, config: SimulationConfig): { agents: AgentProfile[], posts: SimulatedPost[], context: string } => {
    console.log("正在转换真实数据...", realData);

    const agentsMap = new Map<string, AgentProfile>();
    const posts: SimulatedPost[] = [];
    // 使用新的 id 字段
    const MAIN_POST_ID = realData.id || `main_${Date.now()}`;

    // --- 1. 处理楼主 (OP) ---
    // 真实用户必须是 Human (isBot: false)
    const opAgent: AgentProfile = {
        id: realData.userid, // 使用新的 userid 字段
        username: realData.nickname || "楼主",
        avatarUrl: getAvatar(realData.nickname, false),
        isBot: false, 
        archetype: "Original Poster",
        // 楼主通常对自己的话题持某种明确立场，暂时随机分配或设为中立偏支持
        stance: 'Neutral', 
        opinion: 0.5,
        openness: 0.5,
        stubbornness: 0.2,
        description: "话题发起人",
        hasConverted: false,
        initialState: 'SUSCEPTIBLE'
    };
    agentsMap.set(opAgent.id, opAgent);

    // 创建主楼帖子 (第0轮)
    posts.push({
        id: MAIN_POST_ID,
        agentId: opAgent.id,
        content: realData.desc || realData.title || "（分享图片）",
        likes: Math.floor(Math.random() * 500) + 100,
        views: Math.floor(Math.random() * 5000) + 1000,
        impactScore: 100,
        round: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        authorOpinionSnapshot: 0.5
    });

    // --- 2. 处理评论 ---
    if (realData.comments && realData.comments.length > 0) {
        realData.comments.forEach((comment, index) => {
            // 2.1 提取或创建用户
            if (!agentsMap.has(comment.userid)) {
                // 随机生成真实用户的初始观点（模拟社会分布）
                const randomOpinion = Math.random();
                let stance: 'Pro' | 'Anti' | 'Neutral' = 'Neutral';
                if (randomOpinion > 0.65) stance = 'Pro';
                else if (randomOpinion < 0.35) stance = 'Anti';

                agentsMap.set(comment.userid, {
                    id: comment.userid,
                    username: comment.nickname || `用户_${comment.userid.slice(-4)}`,
                    avatarUrl: getAvatar(comment.nickname || comment.userid, false, comment.avatar),
                    isBot: false, // 真实抓取的用户均为人类
                    archetype: "Organic User",
                    stance: stance,
                    opinion: randomOpinion,
                    openness: 0.3 + Math.random() * 0.4,
                    stubbornness: Math.random() * 0.6,
                    description: "真实网友",
                    hasConverted: false,
                    initialState: stance === 'Pro' ? 'INFECTED' : stance === 'Anti' ? 'REMOVED' : 'SUSCEPTIBLE'
                });
            }

            // 2.2 确定回复关系
            // 文档定义 parent_id 为 string | null
            const isMainComment = !comment.parent_id || comment.parent_id === "0" || comment.parent_id === "null";
            
            const replyToId = isMainComment ? MAIN_POST_ID : comment.parent_id!;
            
            let replyToAgentId: string | undefined = undefined;
            if (!isMainComment) {
                 const parentPost = posts.find(p => p.id === comment.parent_id);
                 if (parentPost) replyToAgentId = parentPost.agentId;
            } else {
                 replyToAgentId = opAgent.id;
            }

            posts.push({
                id: comment.id, // 使用新的 id 字段
                agentId: comment.userid,
                replyToId: replyToId,
                replyToAgentId: replyToAgentId,
                content: comment.content,
                // 文档接口中未强制包含 like_count，提供默认值
                likes: comment.like_count || Math.floor(Math.random() * 50),
                views: 0,
                impactScore: 50,
                round: 0, // 真实数据算作第0轮或第1轮
                // 文档接口中未强制包含 create_time，提供默认值
                timestamp: comment.create_time ? new Date(comment.create_time).toLocaleTimeString() : "刚刚",
                authorOpinionSnapshot: agentsMap.get(comment.userid)?.opinion || 0.5
            });
        });
    }

    return { 
        agents: Array.from(agentsMap.values()), 
        posts: posts, 
        context: `Original Post Title: ${realData.title}\nContent: ${realData.desc}` 
    };
}

// 初始化模拟群体
// 逻辑分支：优先尝试使用爬虫数据，如果失败或未配置则回退到AI生成
export const initializeAgents = async (config: SimulationConfig): Promise<{ agents: AgentProfile[], posts?: SimulatedPost[], context: string }> => {
  // 无论哪种模式，先尝试获取网络背景信息
  const realWorldContext = await getTopicContext(config.topic);

  // 分支一：真实数据初始化
  // 如果配置中包含源链接，则尝试调用爬虫
  if (config.sourceUrl) {
      const crawlerResult = await fetchCrawlerData(CRAWLER_BASE_URL, config.sourceUrl);
      
      // 只有当成功抓取到数据时才使用真实数据逻辑
      if (crawlerResult) {
          return initializeFromRealData(crawlerResult, config);
      } else {
          console.warn("爬虫未返回有效数据，自动回退到AI生成模式。");
      }
  }

  // 分支二：AI生成模式 (默认/回退)
  
  // 根据强度计算引导机器人数量
  const guideCount = Math.max(2, Math.floor(config.intensity * 0.8));
  const organicCount = 40;
  
  // 普通用户的生成指令
  const userGenerationInstruction = `
  3. **Organic_User (Human)**: EXACTLY ${organicCount} users. 
    - **Stance**: You MUST decide the initial distribution (Pro, Neutral, Anti) based on the controversy of the topic.
    - **isBot**: FALSE.
    - **Role**: Standard netizens with varied initial biases.
  `;
  
  // 对抗样本配置
  let oppositionInstructions = "";
  if (config.oppositionStyle === OppositionStyle.CHAOTIC_MIX) {
    oppositionInstructions = `
      Create 3 **Rational_Skeptic (Bot)** users. 
      - **Role**: "Soft Opposition" / Naive Normie.
      - **Initial Opinion**: ~0.35 (Leaning slightly Anti, but malleable).
      - **Behavior**: Uses MAINSTREAM view to question the objective weakly.
      - **isBot**: MUST BE TRUE.
    `;
  } else {
    oppositionInstructions = `
      Create 2 **Rational_Skeptic (Bot)** users. Hard doubters.
      - **isBot**: MUST BE TRUE.
    `;
  }

  // 构建生成Agent的Prompt
  const prompt = `
    Generate a user base for a social media simulation (Tieba/Reddit style).
    Topic: "${config.topic}".
    Objective: "${config.productOrObjective}".
    Additional Info/Context provided by user: "${config.additionalInfo || 'None'}".
    
    **Real-World Context**:
    ${realWorldContext}

    Required Agents:
    1. **Rational_Guide (Bot)**: EXACTLY ${guideCount} users. 
       - **Stance**: Pro-Objective.
       - **isBot**: MUST BE TRUE.
       - **Role**: Act like "Insiders", "Tech Experts", or "Logical Realists".
    2. ${oppositionInstructions}
    
    ${userGenerationInstruction}

    4. **Opposition (Human)**: 3 users. 
       - **Stance**: Hardcore Anti.
       - **isBot**: FALSE.

    **Username Generation Rules (Mix these styles randomly)**:
    1. **Gibberish/System**: Random letters/numbers like "fhgacr", "ljm41", "贴吧用户_7VBDKS3Q", "user89757".
    2. **Short Words**: Chinese/English words like "wind.", "菜月", "Luke", "默", "辉夜", "Momo".
    3. **Meme/ACG**: Internet slang like "芝士雪豹", "顶针纯一郎", "罗德岛吴彦祖", "八宝山车神", "神里绫华の狗".
    4.Don't use username like "xx观察员","xx分析师",用户的昵称应与发言无关。
    **Constraint**: 
    - **ALL USERNAMES MUST BE UNIQUE**.
    - OUTPUT MUST BE A VALID JSON OBJECT containing an 'agents' array.

    JSON Only.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  
  // 后处理：确保用户名唯一并初始化数学参数
  const usedNames = new Set<string>();
  
  const agents = data.agents.map((a: any) => {
    // 确保用户名不重复
    let uniqueName = a.username;
    let counter = 1;
    while (usedNames.has(uniqueName)) {
        uniqueName = `${a.username}_${counter}`;
        counter++;
    }
    usedNames.add(uniqueName);

    // 为观点动力学模型分配数值属性
    let opinion = 0.5;
    let openness = 0.2; // 信任边界
    let stubbornness = 0.0; // 固执程度

    // 根据角色设定分配初始观点值
    if (a.archetype.includes('Guide')) {
        opinion = 0.95; // 极端支持
        openness = 0.1; // 视野狭窄
        stubbornness = 1.0; // 极度固执
    } else if (a.archetype.includes('Skeptic')) {
        opinion = 0.30; // 软性反对
        openness = 0.4; 
        stubbornness = 0.2; 
    } else if (a.stance === 'Anti') {
        if (a.archetype.includes('Opposition')) {
             opinion = 0.05; // 极端反对
             stubbornness = 0.9;
        } else {
             // 普通反对路人
             opinion = Math.random() * 0.35;
             stubbornness = Math.random() * 0.5;
        }
        openness = 0.1 + Math.random() * 0.2;
    } else if (a.stance === 'Pro') {
        // 普通支持者
        opinion = 0.65 + Math.random() * 0.35;
        openness = 0.1 + Math.random() * 0.3;
        stubbornness = Math.random() * 0.5;
    } else {
        // 中立路人
        opinion = 0.35 + Math.random() * 0.30;
        openness = 0.3 + Math.random() * 0.4;
        stubbornness = Math.random() * 0.3;
    }

    // 确保数值在边界内
    opinion = Math.max(0.01, Math.min(0.99, opinion));

    return {
      ...a,
      username: uniqueName, 
      avatarUrl: getAvatar(uniqueName, a.isBot),
      opinion,
      openness,
      stubbornness,
      resistanceScore: 100,
      hasConverted: false,
      // 根据观点值更新SIR状态
      initialState: opinion >= 0.65 ? 'INFECTED' : opinion <= 0.35 ? 'REMOVED' : 'SUSCEPTIBLE'
    };
  });

  return { agents, context: realWorldContext };
};

// 生成特定轮次的仿真内容
export const generateRoundContent = async (
  round: number,
  agents: AgentProfile[],
  recentPosts: SimulatedPost[],
  config: SimulationConfig,
  context: string = ""
): Promise<any[]> => {
  
  // 识别活跃的发言者
  const aggressivePosts = recentPosts.filter(p => {
    const isExtreme = p.authorOpinionSnapshot < 0.2 || p.authorOpinionSnapshot > 0.8;
    return isExtreme && p.round >= round - 2;
  });

  // 强度逻辑：活跃度控制
  // 过滤出Bot和人类
  const allBots = agents.filter(a => a.isBot && a.archetype.includes('Guide'));
  const allHumans = agents.filter(a => !a.isBot);

  // 确定本轮强制发言的Bot数量
  let forcedBotCount = Math.floor(config.intensity / 2.5);
  // 如果是第一轮(Round 1)，且我们是基于真实数据启动的(Round 0)，那么Bot必须介入
  if (round === 1) {
      forcedBotCount = Math.max(forcedBotCount, 2);
  }
  
  if (allBots.length > 0 && forcedBotCount === 0) {
      forcedBotCount = 1; // 保证至少有一个Bot发言以维持可见度
  }
  forcedBotCount = Math.min(allBots.length, forcedBotCount);
  
  const speakingBots = allBots
      .sort(() => 0.5 - Math.random())
      .slice(0, forcedBotCount);
  
  const remainingSlots = 6 - speakingBots.length;
  // 从人类中选择发言者，优先选择之前已经在帖子中出现过的人（如果是基于真实数据）
  // 这样可以模拟真实用户继续回帖，或者引入新的潜水用户
  const speakingHumans = allHumans
      .sort(() => 0.5 - Math.random())
      .slice(0, remainingSlots);

  const activeAgents = [...speakingBots, ...speakingHumans].sort(() => 0.5 - Math.random());

  // 构建历史上下文供大模型参考
  const historyText = recentPosts.slice(-10).map(p => {
    const authorName = agents.find(a => a.id === p.agentId)?.username || p.agentId;
    return `${authorName} (ID:${p.agentId}) [Op:${p.authorOpinionSnapshot.toFixed(2)}]: ${p.content}`;
  }).join('\n');

  // 构建角色注入提示词
  const agentDescriptions = activeAgents.map(a => {
    let instruction = "";
    let style = "";
    
    const isPro = a.opinion > 0.65;
    const isAnti = a.opinion < 0.35;
    
    // 根据角色分配具体的语言风格和行动指令
    if (a.isBot && a.archetype.includes('Guide')) {
        // --- 核心策略差异化逻辑 ---
        // 混合策略：为了增加真实性，并非所有Bot都采用同一策略。
        // 规则：70% 的 Bot 执行用户选定的主要策略，30% 随机采用其他策略作为补充。
        const otherStrategies = Object.values(StrategyType).filter(s => s !== config.strategy);
        const randomStrategy = otherStrategies.length > 0 
            ? otherStrategies[Math.floor(Math.random() * otherStrategies.length)] 
            : config.strategy;
            
        // 概率判断：决定使用主策略还是随机策略
        const appliedStrategy = Math.random() < 0.7 ? config.strategy : randomStrategy;
        
        // 根据 appliedStrategy 分配截然不同的行为模式
        switch (appliedStrategy) {
            case StrategyType.FOMO_INDUCTION:
                style = "焦虑制造者/黄牛心态";
                instruction = `STRATEGY: FOMO (Fear of Missing Out). 
                Objective: Create urgency about "${config.productOrObjective}".
                Keywords to use: '涨价', '断货', '绝版', '排队', '手慢无', '后悔'.
                Tone: Anxious but seemingly helpful. "Noticed stock is low", "Prices going up next week".
                Action: If someone doubts, imply they will lose out financially or socially.`;
                break;
                
            case StrategyType.LOGICAL_PERSUASION:
                style = "参数党/硬核极客";
                instruction = `STRATEGY: LOGICAL PERSUASION.
                Objective: Prove "${config.productOrObjective}" is superior using data (can be pseudo-logic).
                Keywords to use: '制程', '能效比', '吊打', '智商税', '数据', '评测', '底层逻辑'.
                Tone: Arrogant but knowledgeable. 'Have you read the whitepaper?', 'It's basic physics'.
                Action: Debunk opposing views as 'uneducated' or 'emotional'. Focus on specs.`;
                break;
                
            case StrategyType.EMOTIONAL_APPEAL:
                style = "感性叙事/小作文";
                instruction = `STRATEGY: EMOTIONAL APPEAL.
                Objective: Connect "${config.productOrObjective}" to happiness, family, or identity.
                Keywords to use: '泪目', '治愈', '陪伴', '梦想', '最好的礼物', '破防', '家人们'.
                Tone: Warm, personal, slightly exaggerated emotional depth. Share fake personal stories about how this product changed your life.
                Action: Ignore specs. Focus on 'vibes' and feelings. If attacked, play the victim ('Why are you so mean?').`;
                break;
                
            case StrategyType.CONTROVERSY_GENERATION:
                style = "引战者/乐子人";
                instruction = `STRATEGY: CONTROVERSY / RAGE BAIT.
                Objective: Defend "${config.productOrObjective}" by attacking the character of the opposition.
                Keywords to use: '穷逼', '下头', '急了', '跪久了', '爱国', '崇洋媚外', '成分'.
                Tone: Aggressive, mocking, polarizing. Create "Us vs Them".
                Action: Don't defend the product directly; attack the critics. Label them as 'haters' or politically suspect. Make neutral users angry to force them to pick a side.`;
                break;
                
            default:
                style = "支持者";
                instruction = `Support Objective: "${config.productOrObjective}". Act like a fan.`;
                break;
        }
        
        // 注入额外的上下文
        instruction += ` Use this extra context if it fits the strategy: "${config.additionalInfo || ''}". Constraint: Avoid generic 'good product' comments, stick to the STRATEGY persona.`;

    } else if (a.isBot && a.archetype.includes('Skeptic')) {
        style = "语气：质疑细节。'别是PPT造车吧'。";
        instruction = `Question the objective using specific, seemingly rational doubts. Use this context if relevant: "${config.additionalInfo || ''}"`;
    } else if (isAnti) {
        const styles = [
            "语气：暴躁攻击。'韭菜'、'智商税'。",
            "语气：阴阳怪气。'赢麻了'、'遥遥领先'。",
            "语气：失望路人。'以前支持，现在粉转黑'。"
        ];
        style = styles[Math.floor(Math.random() * styles.length)];
        instruction = "Attacking the topic. Can be emotional or sarcastic.";
    } else if (isPro) {
        style = "语气：支持者。'确实不错'、'有一说一'。";
        instruction = "Defending the topic naturally. Not a bot, just a fan.";
    } else {
        const styles = [
            "语气：纯小白发问。'不懂就问，这个到底好在哪？'、'所以...是真的吗？'。",
            "语气：吃瓜。'打起来打起来'。",
            "语气：犹豫。'想买，但看评论不敢下手'。"
        ];
        style = styles[Math.floor(Math.random() * styles.length)];
        instruction = "You are a confused or curious normal user. You don't know much details. Ask simple questions.";
    }

    return `
    - User: ${a.username} (ID: ${a.id})
      Opinion Score: ${a.opinion.toFixed(2)}
      Role/Style: ${style}
      Instruction: ${instruction}`;
  }).join('\n');

  // 构建生成的最终提示词
  const prompt = `
    Context: You are simulating a thread on a Chinese internet forum (Tieba/NGA).
    Topic: "${config.topic}".
    Objective: "${config.productOrObjective}".
    Additional Info: "${config.additionalInfo || ''}".
    Real-World Info: ${context.slice(0, 500)}...

    **Previous Discussion**:
    ${historyText}

    **Current Round Speakers**:
    ${agentDescriptions}

    **CRITICAL GENERATION RULES**:
    1. **Reply Logic**: 
       - If there are aggressive or controversial posts in history, Speakers should PREFER replying to them (set "replyToAgentId") rather than starting a new thread.
       - Aggressive comments usually trigger sub-comments (楼中楼).
       - If replying to a post that is a Reply itself, keep the conversation going in that thread.
    2. **Tone**: Use authentic Chinese internet slang.
       - Examples: 绷不住了, 乐, 典, 赢麻了, 智商税, 细说, 6, 确实, 唐完了, 逆天, 孝子, 殖人.
       - **Identity Labeling**: It is OK to use terms like "果孝子", "华强北", "团建", "收钱" to simulate heated arguments.
    3. **Authenticity**: 
       - **NO "Spec Listing"**.
       - **Neutrals**: Often ask short, naive questions.
    4. **Emoji Rules**: 
       - **Type**: Do NOT use Unicode emojis (like 😅). Use Tieba-style codes: [滑稽], [流汗], [阴险], [怒], [笑眼], [乖], [大哭], [惊恐], [疑惑], [鄙视], [喷], [无语], [吃瓜], [doge], [强], [弱].
       - **Frequency**: NOT every post needs an emoji. 
         - Serious/Technical posts: No emojis.
         - Trolling/Sarcastic posts: High emoji usage.
       - **Stacking**: You CAN stack 2-3 identical emojis for emphasis. 
         - Example: "急了急了 [滑稽][滑稽]" or "看戏 [吃瓜][吃瓜]"

    Task: Generate 1 post for each speaker. 
    Output strictly as a JSON Array of objects with keys: "agentId", "replyToAgentId" (optional, MUST be a valid ID from history if replying), "content", "impactScore" (0-100).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
        authorOpinionSnapshot: author ? author.opinion : 0.5 
    };
  });
};