import React, { useMemo } from 'react';
import { SimulationResult } from '../types';
import { Brain, Zap, Biohazard, Activity, BarChart2, Scale, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, YAxis, ReferenceLine, Legend, Cell } from 'recharts';

interface AnalysisDashboardProps {
  result: SimulationResult;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result }) => {
  
  // 1. SIR Data (Localized)
  const sirData = useMemo(() => {
      return result.analysis.sirStats.map(stat => ({
          name: `R${stat.round}`,
          "中立者 (易感)": stat.s_count,
          "支持者 (感染)": stat.i_count,
          "反对者 (移除)": stat.r_count
      }));
  }, [result.analysis.sirStats]);

  // 2. Advanced Metrics (Polarization & Entropy)
  const metricsData = useMemo(() => {
    return result.analysis.sirStats.map(stat => ({
        name: `R${stat.round}`,
        "极化指数 (冲突)": Number((stat.polarizationIndex || 0).toFixed(2)),
        "信息熵 (多样性)": Number((stat.entropy || 0).toFixed(2)),
    }));
  }, [result.analysis.sirStats]);

  // 3. Current Opinion Distribution (Histogram)
  const distributionData = useMemo(() => {
    const bins = 10;
    const data = new Array(bins).fill(0).map((_, i) => ({
        range: `${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}`,
        count: 0,
        fill: i < 4 ? '#ef4444' : i > 6 ? '#3b82f6' : '#9ca3af' // Anti=Red, Pro=Blue
    }));
    
    result.agents.forEach(a => {
        if(a.isBot) return; // Only map real users
        const idx = Math.min(Math.floor(a.opinion * bins), bins - 1);
        data[idx].count++;
    });
    return data;
  }, [result.agents]);

  const latestStats = result.analysis.sirStats[result.analysis.sirStats.length - 1] || {};

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      
      {/* 1. SIR Dynamics */}
      <div class="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative group">
        <div class="flex items-center gap-2 mb-4 text-gray-400">
           <Biohazard class="w-5 h-5 text-yellow-500" />
           <h3 class="text-xs font-bold uppercase tracking-widest">舆论传播模型 (SIR)</h3>
           <Info class="w-3 h-3 text-gray-600 ml-auto cursor-help" />
        </div>
        <div class="absolute top-12 left-5 right-5 bg-gray-950/90 border border-gray-700 p-3 rounded z-10 text-[10px] text-gray-300 hidden group-hover:block shadow-xl">
            <p class="mb-1"><strong class="text-blue-400">支持者 (I)</strong>: 已接受被引导观点的人群。</p>
            <p class="mb-1"><strong class="text-gray-400">中立者 (S)</strong>: 尚未表态，容易被影响的人群。</p>
            <p><strong class="text-red-400">反对者 (R)</strong>: 强烈反对或对此免疫的人群。</p>
        </div>
        <div class="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sirData}>
                    <defs>
                        <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stop-color="#3b82f6" stop-opacity={0.8}/>
                            <stop offset="95%" stop-color="#3b82f6" stop-opacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stop-color="#ef4444" stop-opacity={0.8}/>
                            <stop offset="95%" stop-color="#ef4444" stop-opacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#111827', border: '1px solid #374151'}} itemStyle={{fontSize: 12}} />
                    <Area type="monotone" dataKey="支持者 (感染)" stackId="1" stroke="#3b82f6" fill="url(#colorInf)" />
                    <Area type="monotone" dataKey="中立者 (易感)" stackId="1" stroke="#9ca3af" fill="#374151" />
                    <Area type="monotone" dataKey="反对者 (移除)" stackId="1" stroke="#ef4444" fill="url(#colorRem)" />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Scientific Metrics (Polarization/Entropy) */}
      <div class="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative group">
         <div class="flex items-center gap-2 mb-4 text-gray-400">
           <Scale class="w-5 h-5 text-purple-500" />
           <h3 class="text-xs font-bold uppercase tracking-widest">群体动力学指标</h3>
           <Info class="w-3 h-3 text-gray-600 ml-auto cursor-help" />
        </div>
        <div class="absolute top-12 left-5 right-5 bg-gray-950/90 border border-gray-700 p-3 rounded z-10 text-[10px] text-gray-300 hidden group-hover:block shadow-xl">
            <p class="mb-2"><strong class="text-purple-400">极化指数 (Esteban-Ray)</strong>: 数值越高，表示群体分裂越严重，越容易爆发冲突。低数值代表共识度高。</p>
            <p><strong class="text-emerald-400">信息熵 (Shannon)</strong>: 数值越高，表示声音越多元、混乱。数值降低意味着“回声室”效应形成，声音趋于单一。</p>
        </div>
        <div class="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#111827', border: '1px solid #374151'}} itemStyle={{fontSize: 12}} />
                    <Area type="monotone" dataKey="极化指数 (冲突)" stroke="#a855f7" fillOpacity={0} strokeWidth={2} />
                    <Area type="monotone" dataKey="信息熵 (多样性)" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Real-Time Opinion Distribution (Histogram) */}
      <div class="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm flex flex-col relative group">
        <div class="flex items-center gap-2 mb-4 text-gray-400">
           <BarChart2 class="w-5 h-5 text-blue-500" />
           <h3 class="text-xs font-bold uppercase tracking-widest">实时观点分布</h3>
           <Info class="w-3 h-3 text-gray-600 ml-auto cursor-help" />
        </div>
        <div class="absolute top-12 left-5 right-5 bg-gray-950/90 border border-gray-700 p-3 rounded z-10 text-[10px] text-gray-300 hidden group-hover:block shadow-xl">
            <p>显示了当前所有用户（不含Bot）的观点分布情况。</p>
            <p class="mt-1">左侧 <span class="text-red-400">红色</span> 为反对区域，右侧 <span class="text-blue-400">蓝色</span> 为支持区域。</p>
        </div>
        
        <div class="flex-1 min-h-[160px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="range" stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#111827', border: '1px solid #374151'}} />
                    <ReferenceLine x="0.5" stroke="white" strokeDasharray="3 3" />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                </BarChart>
             </ResponsiveContainer>
        </div>
        
        <div class="flex justify-between mt-2 text-[10px] text-gray-500 border-t border-gray-800 pt-2">
            <div>
               <span class="block text-red-400">平均观点: {Number(latestStats.averageOpinion).toFixed(2)}</span>
               <span class="text-[9px]">0=反对, 1=支持</span>
            </div>
            <div>
               <span class="block text-purple-400">极化度: {Number(latestStats.polarizationIndex).toFixed(2)}</span>
               <span class="text-[9px]">High = 严重对立</span>
            </div>
        </div>
      </div>

    </div>
  );
};

export default AnalysisDashboard;