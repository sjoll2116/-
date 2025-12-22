import React, { useState, useEffect, useRef, useMemo } from 'react';
import ConfigPanel from './components/ConfigPanel';
import TiebaFloor from './components/FeedItem'; // 引入贴吧楼层组件
import AnalysisDashboard from './components/AnalysisDashboard';
import { initializeAgents, generateRoundContent } from './services/geminiService';
import { calculateDistribution, updatePublicOpinion, calculatePolarization, calculateEntropy } from './services/simulationEngine';
import { SimulationConfig, SimulationState, SimulatedPost, AgentProfile } from './types';
import { Terminal, Search, MessageCircle, AlertTriangle, Play, Pause, FastForward, Loader2, Activity, Globe, Menu, ChevronLeft } from 'lucide-react';

const App: React.FC = () => {
  // 集中状态管理
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [processingRound, setProcessingRound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // 初始化流程
  const handleInit = async (cfg: SimulationConfig) => {
    setLoading(true);
    setError(null);
    setConfig(cfg);
    try {
      // 调用服务初始化，结果可能包含第一轮的帖子（如果是使用爬虫数据）
      const initResult = await initializeAgents(cfg);
      const { agents, context, posts: initialPosts } = initResult;
      
      // 计算初始的SIR模型统计数据
      const s = agents.filter(a => !a.isBot && a.stance === 'Neutral').length;
      const i = agents.filter(a => !a.isBot && a.stance === 'Pro').length;
      const r = agents.filter(a => !a.isBot && a.stance === 'Anti').length;

      // 计算初始的高级指标
      const polarization = calculatePolarization(agents);
      const entropy = calculateEntropy(agents);
      const avgOp = agents.reduce((sum, a) => sum + a.opinion, 0) / (agents.length || 1);

      // 确定起始状态，如果有爬虫数据则直接开始于第1轮
      const startPosts = initialPosts && initialPosts.length > 0 ? initialPosts : [];
      const startRound = startPosts.length > 0 ? 1 : 0;

      setSimState({
        agents,
        posts: startPosts,
        round: startRound,
        isRunning: true,
        stats: [{ 
          round: 0, 
          s_count: s, 
          i_count: i, 
          r_count: r,
          polarizationIndex: polarization,
          entropy: entropy,
          averageOpinion: avgOp
        }],
        semanticDrift: [],
        realWorldContext: context // 存储获取到的现实背景
      });
    } catch (err) {
      console.error(err);
      setError("初始化失败，请重试。(可能是网络搜索超时或爬虫接口无响应)");
    } finally {
      setLoading(false);
    }
  };

  // 模拟循环步进函数
  const handleNextRound = async () => {
    if (!simState || !config || processingRound) return;
    setProcessingRound(true);

    try {
      const currentRound = simState.round + 1;
      
      // 步骤A: AI生成内容
      // 传入现实背景信息以增强生成的合理性
      const rawPosts = await generateRoundContent(
        currentRound, 
        simState.agents, 
        simState.posts, 
        config,
        simState.realWorldContext
      );
      
      // 步骤B: 算法分发 (Feed流逻辑)
      // 根据配置的强度参数影响帖子的浏览量和点赞
      const processedPosts = calculateDistribution(rawPosts, simState.agents, config);
      
      // 步骤C: 观点动力学演化 (SIR模型 & Bot转化)
      const { updatedAgents, roundStat } = updatePublicOpinion(simState.agents, processedPosts, config);
      roundStat.round = currentRound;

      setSimState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          round: currentRound,
          agents: updatedAgents,
          posts: [...prev.posts, ...processedPosts],
          stats: [...prev.stats, roundStat]
        };
      });

    } catch (err) {
      console.error(err);
      setAutoPlay(false); // 出错时停止自动播放
    } finally {
      setProcessingRound(false);
    }
  };

  // 自动播放副作用
  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (autoPlay && simState && !processingRound && simState.round < 15) {
      interval = setTimeout(() => {
        handleNextRound();
      }, 3000); // 留出阅读时间
    }
    return () => clearTimeout(interval);
  }, [autoPlay, simState, processingRound]);

  // 自动滚动逻辑
  useEffect(() => {
    if (bottomRef.current && autoPlay) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simState?.posts, autoPlay]);

  // 帖子分组逻辑：将平铺的帖子转化为贴吧式的楼层和楼中楼结构
  // 改进：保持对话连贯性，回复现有楼层的对话会停留在该楼层
  const threads = useMemo(() => {
    if (!simState) return [];

    const groupedFloors: { main: SimulatedPost, subs: SimulatedPost[] }[] = [];
    
    // 追踪每个Agent当前活跃在哪一个楼层
    // 如果B回复了A (1楼)，B就在1楼活跃
    // 如果A回复回B，A应该留在1楼而不是新开一楼
    const agentActiveFloorIndex: Record<string, number> = {}; 

    simState.posts.forEach((post) => {
        const isReply = !!post.replyToAgentId;
        let targetFloorIndex = -1;

        if (isReply && post.replyToAgentId) {
            const targetId = post.replyToAgentId;
            // 查找回复对象最后一次出现的楼层
            if (agentActiveFloorIndex[targetId] !== undefined) {
                targetFloorIndex = agentActiveFloorIndex[targetId];
            }
        }

        if (targetFloorIndex !== -1) {
            // 作为楼中楼添加
            groupedFloors[targetFloorIndex].subs.push(post);
            // 标记该Agent当前活跃于此楼层
            agentActiveFloorIndex[post.agentId] = targetFloorIndex;
        } else {
            // 新开一楼
            const newIndex = groupedFloors.length;
            groupedFloors.push({ main: post, subs: [] });
            // 标记该Agent活跃于新楼层
            agentActiveFloorIndex[post.agentId] = newIndex;
        }
    });

    return groupedFloors;
  }, [simState?.posts]);


  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-900 font-sans overflow-hidden">
      {/* 侧边栏配置面板 */}
      <div className={simState ? 'pointer-events-none opacity-50 hidden md:block' : 'hidden md:block'}>
         <ConfigPanel onSimulate={handleInit} isLoading={loading} />
      </div>

      <div className="flex-1 flex flex-col h-full relative">
        
        {/* 贴吧风格顶部导航栏 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-gray-500 hover:text-blue-600 cursor-pointer transition-colors">
               <ChevronLeft className="w-5 h-5" />
               <span className="text-sm ml-1 font-medium">返回贴吧</span>
            </div>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <div className="flex items-center gap-2">
               <div className="bg-blue-600 text-white p-0.5 px-1.5 rounded text-[10px] font-bold">贴</div>
               <span className="font-bold text-sm tracking-tight text-gray-800 truncate max-w-[200px]">
                 {config ? config.topic : "舆论模拟器"}
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {simState && (
               <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-2">Control</span>
                  <button onClick={() => setAutoPlay(!autoPlay)} className="p-1 hover:text-blue-600 text-gray-500 transition">
                     {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={handleNextRound} disabled={processingRound} className="p-1 hover:text-blue-600 text-gray-500 transition">
                     <FastForward className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-gray-400 ml-2 border-l border-gray-300 pl-2">
                    Round {simState.round}
                  </span>
               </div>
            )}
            
            <div className="hidden md:flex items-center bg-gray-100 border border-gray-200 rounded px-3 py-1.5 w-48 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
               <input type="text" placeholder="本吧搜索" className="bg-transparent border-none outline-none text-xs text-gray-600 w-full placeholder-gray-400" />
               <Search className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f3f4f6] scroll-smooth relative custom-scrollbar">
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-3 text-red-600 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          {!simState && !loading && (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <MessageCircle className="w-16 h-16 mb-4 opacity-20 text-gray-400" />
                <h2 className="text-xl font-bold text-gray-600 mb-2">等待发帖...</h2>
                <p className="max-w-md text-sm text-gray-500">
                  左侧配置好话题后，点击“开始模拟”生成主题帖。
                </p>
             </div>
          )}

          {loading && (
             <div className="h-full flex flex-col items-center justify-center p-8">
               <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
               <p className="text-blue-600 font-mono text-sm mb-2 font-bold">
                 {config?.sourceUrl ? "正在采集真实舆情数据 (爬虫运行中)..." : "正在生成虚拟网民..."}
               </p>
               <p className="text-emerald-600 font-mono text-xs animate-pulse">正在检索互联网话题背景...</p>
             </div>
          )}

          {simState && config && (
            <div className="max-w-[980px] mx-auto pb-20 pt-6 px-2 md:px-4">
               
               {/* 数据仪表盘 */}
               <div className="mb-6">
                  <AnalysisDashboard result={{
                      agents: simState.agents,
                      posts: simState.posts,
                      analysis: {
                        dominatingSentiment: "",
                        effectivenessScore: 0,
                        narrativeSummary: "",
                        sirStats: simState.stats,
                        semanticDrift: simState.semanticDrift
                      }
                  }} />
               </div>

               {/* 主题帖头部信息 */}
               <div className="bg-white border border-gray-200 p-5 mb-4 relative overflow-hidden shadow-sm rounded-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2 px-2 leading-relaxed">
                     {config.topic}
                  </h1>
                  <div className="flex items-center gap-4 px-2 text-xs text-gray-500">
                     <span className="bg-red-50 text-red-600 px-1 border border-red-200 rounded-sm font-medium">置顶</span>
                     <span className="bg-blue-50 text-blue-600 px-1 border border-blue-200 rounded-sm font-medium">精</span>
                     <span>回复: {simState.posts.length}</span>
                     <span>浏览: {simState.posts.length * 453}</span>
                  </div>
                  {/* 背景信息展示框 */}
                  {simState.realWorldContext && (
                    <div className="mt-4 mx-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 font-mono leading-relaxed max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                       <strong className="block text-emerald-700 mb-1 sticky top-0 bg-gray-50 pb-1 border-b border-gray-200">// 背景提要 (联网获取)</strong>
                       <div className="whitespace-pre-wrap">
                         {simState.realWorldContext}
                       </div>
                    </div>
                  )}
               </div>

               {/* 渲染贴吧楼层 */}
               <div className="space-y-4">
                  {/* 如果还没有帖子，显示楼主正在准备的提示 */}
                  {threads.length === 0 && (
                      <div className="bg-white border border-gray-200 p-10 text-center text-gray-400 shadow-sm rounded-sm">
                          楼主正在组织语言... (等待第一轮模拟)
                      </div>
                  )}

                  {threads.map((thread, index) => {
                      const agent = simState.agents.find(a => a.id === thread.main.agentId);
                      if (!agent) return null;
                      
                      const subCommentsWithAgents = thread.subs.map(sub => {
                          const author = simState.agents.find(a => a.id === sub.agentId) || agent;
                          const targetAgent = sub.replyToAgentId ? simState.agents.find(a => a.id === sub.replyToAgentId) : null;
                          return {
                              post: sub,
                              agent: author,
                              replyToUsername: targetAgent ? targetAgent.username : null
                          };
                      }).filter(item => !!item.agent);

                      return (
                        <TiebaFloor 
                           key={thread.main.id} 
                           floorPost={thread.main} 
                           agent={agent} 
                           floorIndex={index + 1}
                           subComments={subCommentsWithAgents}
                        />
                      );
                  })}
                  <div ref={bottomRef} />
               </div>

               {/* 分页器 */}
               {threads.length > 5 && (
                 <div className="mt-6 flex justify-center gap-2 text-sm text-gray-600">
                    <button className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm shadow-sm transition">上一页</button>
                    <button className="px-3 py-1 bg-blue-600 text-white border border-blue-600 rounded-sm shadow-sm">1</button>
                    <button className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm shadow-sm transition">2</button>
                    <button className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm shadow-sm transition">3</button>
                    <button className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-sm shadow-sm transition">下一页</button>
                 </div>
               )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;