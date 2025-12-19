import React, { useState, useEffect, useRef, useMemo } from 'react';
import ConfigPanel from './components/ConfigPanel';
import TiebaFloor from './components/FeedItem'; // Importing the new TiebaFloor component
import AnalysisDashboard from './components/AnalysisDashboard';
import { initializeAgents, generateRoundContent } from './services/geminiService';
import { calculateDistribution, updatePublicOpinion } from './services/simulationEngine';
import { SimulationConfig, SimulationState, SimulatedPost, AgentProfile } from './types';
import { Terminal, Search, MessageCircle, AlertTriangle, Play, Pause, FastForward, Loader2, Activity, Globe, Menu, ChevronLeft } from 'lucide-react';

const App: React.FC = () => {
  // Central State
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [simState, setSimState] = useState<SimulationState | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [processingRound, setProcessingRound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Initialization
  const handleInit = async (cfg: SimulationConfig) => {
    setLoading(true);
    setError(null);
    setConfig(cfg);
    try {
      // Now returns { agents, context }
      const initResult = await initializeAgents(cfg);
      const { agents, context } = initResult;
      
      // Calculate initial SIR stats
      const s = agents.filter(a => !a.isBot && a.stance === 'Neutral').length;
      const i = agents.filter(a => !a.isBot && a.stance === 'Pro').length;
      const r = agents.filter(a => !a.isBot && a.stance === 'Anti').length;

      setSimState({
        agents,
        posts: [],
        round: 0,
        isRunning: true,
        stats: [{ round: 0, s_count: s, i_count: i, r_count: r }],
        semanticDrift: [],
        realWorldContext: context // Store context
      });
    } catch (err) {
      console.error(err);
      setError("初始化失败，请重试。(可能是网络搜索超时)");
    } finally {
      setLoading(false);
    }
  };

  // 2. Step Function (The Loop)
  const handleNextRound = async () => {
    if (!simState || !config || processingRound) return;
    setProcessingRound(true);

    try {
      const currentRound = simState.round + 1;
      
      // A. AI Generation (The Brain) - Pass realWorldContext
      const rawPosts = await generateRoundContent(
        currentRound, 
        simState.agents, 
        simState.posts, 
        config,
        simState.realWorldContext
      );
      
      // B. Algorithm Distribution (The Feed)
      const processedPosts = calculateDistribution(rawPosts, simState.agents);
      
      // C. Opinion Dynamics (The SIR Model & Bot Conversion)
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
      setAutoPlay(false); // Stop autoplay on error
    } finally {
      setProcessingRound(false);
    }
  };

  // AutoPlay Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoPlay && simState && !processingRound && simState.round < 15) {
      interval = setTimeout(() => {
        handleNextRound();
      }, 3000); // Slower pacing for reading
    }
    return () => clearTimeout(interval);
  }, [autoPlay, simState, processingRound]);

  // Auto-scroll logic (Optimized for floors)
  useEffect(() => {
    if (bottomRef.current && autoPlay) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simState?.posts, autoPlay]);

  // --- Logic: Group Posts into Tieba Threads (Floors & Sub-comments) ---
  const threads = useMemo(() => {
    if (!simState) return [];

    const groupedFloors: { main: SimulatedPost, subs: SimulatedPost[] }[] = [];
    const agentLastFloorIndex: Record<string, number> = {}; 

    simState.posts.forEach((post) => {
        const isReply = !!post.replyToAgentId;
        let parentFloorIndex = -1;

        if (isReply && post.replyToAgentId) {
            const targetId = post.replyToAgentId; 
            if (targetId && agentLastFloorIndex[targetId] !== undefined) {
                parentFloorIndex = agentLastFloorIndex[targetId];
            }
        }

        if (parentFloorIndex !== -1) {
            // Add as sub-comment (楼中楼)
            groupedFloors[parentFloorIndex].subs.push(post);
        } else {
            // New Floor
            const newIndex = groupedFloors.length;
            groupedFloors.push({ main: post, subs: [] });
            agentLastFloorIndex[post.agentId] = newIndex;
        }
    });

    return groupedFloors;
  }, [simState?.posts]);


  return (
    <div class="flex h-screen bg-[#101010] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar Configuration */}
      <div class={simState ? 'pointer-events-none opacity-50 hidden md:block' : 'hidden md:block'}>
         <ConfigPanel onSimulate={handleInit} isLoading={loading} />
      </div>

      <div class="flex-1 flex flex-col h-full relative">
        
        {/* Simplified Tieba Header */}
        <header class="h-14 bg-[#2d2d2d] border-b border-[#3a3a3a] flex items-center justify-between px-4 z-20 shadow-md">
          <div class="flex items-center gap-4">
            <div class="flex items-center text-gray-400 hover:text-white cursor-pointer">
               <ChevronLeft class="w-5 h-5" />
               <span class="text-sm ml-1">返回贴吧</span>
            </div>
            <div class="h-4 w-[1px] bg-gray-600"></div>
            <div class="flex items-center gap-2">
               <div class="bg-blue-600 p-0.5 px-1.5 rounded text-[10px] font-bold">贴</div>
               <span class="font-bold text-sm tracking-tight text-white truncate max-w-[200px]">
                 {config ? config.topic : "舆论模拟器"}
               </span>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            {simState && (
               <div class="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#3e3e3e]">
                  <span class="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Control</span>
                  <button onClick={() => setAutoPlay(!autoPlay)} class="p-1 hover:text-blue-400 text-gray-400 transition">
                     {autoPlay ? <Pause class="w-4 h-4" /> : <Play class="w-4 h-4" />}
                  </button>
                  <button onClick={handleNextRound} disabled={processingRound} class="p-1 hover:text-blue-400 text-gray-400 transition">
                     <FastForward class="w-4 h-4" />
                  </button>
                  <span class="text-[10px] text-gray-500 ml-2 border-l border-gray-700 pl-2">
                    Round {simState.round}
                  </span>
               </div>
            )}
            
            <div class="hidden md:flex items-center bg-[#1a1a1a] border border-[#3e3e3e] rounded px-3 py-1.5 w-48">
               <input type="text" placeholder="本吧搜索" class="bg-transparent border-none outline-none text-xs text-gray-400 w-full" />
               <Search class="w-3 h-3 text-gray-500" />
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto bg-[#101010] scroll-smooth relative custom-scrollbar">
          {error && (
            <div class="m-6 p-4 bg-red-950/30 border border-red-900 rounded flex items-center gap-3 text-red-400">
              <AlertTriangle class="w-5 h-5" />
              {error}
            </div>
          )}

          {!simState && !loading && (
             <div class="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                <MessageCircle class="w-16 h-16 mb-4 opacity-20" />
                <h2 class="text-xl font-bold text-gray-500 mb-2">等待发帖...</h2>
                <p class="max-w-md text-sm text-gray-600">
                  左侧配置好话题后，点击“开始模拟”生成主题帖。
                </p>
             </div>
          )}

          {loading && (
             <div class="h-full flex flex-col items-center justify-center p-8">
               <Loader2 class="w-12 h-12 text-blue-500 animate-spin mb-4" />
               <p class="text-blue-400 font-mono text-sm mb-2">正在生成虚拟网民...</p>
               <p class="text-emerald-500 font-mono text-xs animate-pulse">正在检索互联网话题背景...</p>
             </div>
          )}

          {simState && config && (
            <div class="max-w-[980px] mx-auto pb-20 pt-6 px-2 md:px-4">
               
               {/* Dashboard embedded as a "Top Info" section - now simplified */}
               <div class="mb-6">
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

               {/* Thread Header (Topic) */}
               <div class="bg-[#252525] border border-[#353535] p-5 mb-4 relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                  <h1 class="text-2xl font-bold text-[#d1d5db] mb-2 px-2 leading-relaxed">
                     {config.topic}
                  </h1>
                  <div class="flex items-center gap-4 px-2 text-xs text-gray-500">
                     <span class="bg-red-900/50 text-red-400 px-1 border border-red-900 rounded-sm">置顶</span>
                     <span class="bg-blue-900/50 text-blue-400 px-1 border border-blue-900 rounded-sm">精</span>
                     <span>回复: {simState.posts.length}</span>
                     <span>浏览: {simState.posts.length * 453}</span>
                  </div>
                  {/* Context Info Box */}
                  {simState.realWorldContext && (
                    <div class="mt-4 mx-2 p-3 bg-[#1a1a1a] border border-[#333] rounded text-xs text-gray-400 font-mono leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                       <strong class="block text-emerald-600 mb-1 sticky top-0 bg-[#1a1a1a] pb-1 border-b border-[#333]">// 背景提要 (联网获取)</strong>
                       <div class="whitespace-pre-wrap">
                         {simState.realWorldContext}
                       </div>
                    </div>
                  )}
               </div>

               {/* Tieba Floors */}
               <div class="space-y-4">
                  {/* Generate a Fake "LZ" (Landlord) Floor using the Objective if no posts yet */}
                  {threads.length === 0 && (
                      <div class="bg-[#252525] border border-[#353535] p-10 text-center text-gray-500">
                          楼主正在组织语言... (等待第一轮模拟)
                      </div>
                  )}

                  {threads.map((thread, index) => {
                      const agent = simState.agents.find(a => a.id === thread.main.agentId);
                      if (!agent) return null;
                      
                      const subCommentsWithAgents = thread.subs.map(sub => ({
                          post: sub,
                          agent: simState.agents.find(a => a.id === sub.agentId) || agent
                      })).filter(item => !!item.agent);

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

               {/* Pagination / Footer */}
               {threads.length > 5 && (
                 <div class="mt-6 flex justify-center gap-2 text-sm text-[#d1d5db]">
                    <button class="px-3 py-1 bg-[#252525] border border-[#353535] hover:bg-[#333]">上一页</button>
                    <button class="px-3 py-1 bg-blue-600 text-white border border-blue-600">1</button>
                    <button class="px-3 py-1 bg-[#252525] border border-[#353535] hover:bg-[#333]">2</button>
                    <button class="px-3 py-1 bg-[#252525] border border-[#353535] hover:bg-[#333]">3</button>
                    <button class="px-3 py-1 bg-[#252525] border border-[#353535] hover:bg-[#333]">下一页</button>
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