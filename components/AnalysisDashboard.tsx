import React, { useMemo } from 'react';
import { SimulationResult, RoundStat } from '../types';
import { Biohazard, Scale, BarChart2, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, YAxis, ReferenceLine, Legend, Cell } from 'recharts';

interface AnalysisDashboardProps {
  result: SimulationResult;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result }) => {
  
  // 1. SIR Data (Calculated Percentages for independent trends)
  const sirData = useMemo(() => {
      return result.analysis.sirStats.map(stat => {
          const total = stat.s_count + stat.i_count + stat.r_count || 1;
          return {
              name: `R${stat.round}`,
              "中立者": Number((stat.s_count / total * 100).toFixed(1)),
              "支持者": Number((stat.i_count / total * 100).toFixed(1)),
              "反对者": Number((stat.r_count / total * 100).toFixed(1)),
          };
      });
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
    const data = new Array(bins).fill(0).map((_, i) => {
        // Range 0-0.1, 0.1-0.2, ...
        // Color Logic based on thresholds:
        // Anti <= 0.35 (Bins 0, 1, 2, 3)
        // Neutral > 0.35 && < 0.65 (Bins 4, 5)
        // Pro >= 0.65 (Bins 6, 7, 8, 9)
        let fill = '#9ca3af';
        if (i <= 3) fill = '#ef4444'; // Anti (0-0.4 approx)
        else if (i >= 6) fill = '#3b82f6'; // Pro (0.6-1.0 approx)
        
        return {
            range: `${(i/10).toFixed(1)}-${((i+1)/10).toFixed(1)}`,
            count: 0,
            fill: fill
        };
    });
    
    result.agents.forEach(a => {
        if(a.isBot) return; // Only map real users
        const idx = Math.min(Math.floor(a.opinion * bins), bins - 1);
        data[idx].count++;
    });
    return data;
  }, [result.agents]);

  const latestStats: RoundStat = result.analysis.sirStats[result.analysis.sirStats.length - 1] || {
    round: 0,
    s_count: 0,
    i_count: 0,
    r_count: 0,
    polarizationIndex: 0,
    entropy: 0,
    averageOpinion: 0.5
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      
      {/* 1. SIR Dynamics (Independent Percentages) */}
      <div className="bg-white/80 border border-gray-200 rounded-xl p-5 backdrop-blur-sm relative group shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-gray-500">
           <Biohazard className="w-5 h-5 text-yellow-600" />
           <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">舆论传播模型 (占比趋势)</h3>
           <Info className="w-3 h-3 text-gray-400 ml-auto cursor-help" />
        </div>
        <div className="absolute top-12 left-5 right-5 bg-white border border-gray-200 p-3 rounded z-10 text-[10px] text-gray-600 hidden group-hover:block shadow-xl">
            <p className="mb-1"><strong className="text-blue-600">支持者 (Pro)</strong>: 观点 ≥ 0.65。</p>
            <p className="mb-1"><strong className="text-gray-600">中立者 (Neutral)</strong>: 观点 0.35 - 0.65。</p>
            <p><strong className="text-red-600">反对者 (Anti)</strong>: 观点 ≤ 0.35。</p>
            <p className="mt-2 text-gray-400">图表显示各群体占总人数的百分比变化。</p>
        </div>
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sirData}>
                    <defs>
                        <linearGradient id="gradPro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradAnti" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} width={30} stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`]}
                      contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#333'}} 
                      itemStyle={{fontSize: 12, color: '#333'}} 
                      labelStyle={{color: '#666'}}
                    />
                    <Area type="monotone" dataKey="支持者" stroke="#3b82f6" fill="url(#gradPro)" strokeWidth={2} activeDot={{r: 4}} />
                    <Area type="monotone" dataKey="反对者" stroke="#ef4444" fill="url(#gradAnti)" strokeWidth={2} activeDot={{r: 4}} />
                    <Area type="monotone" dataKey="中立者" stroke="#9ca3af" fill="url(#gradNeutral)" strokeWidth={2} strokeDasharray="4 4" activeDot={{r: 4}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Scientific Metrics (Polarization/Entropy) */}
      <div className="bg-white/80 border border-gray-200 rounded-xl p-5 backdrop-blur-sm relative group shadow-sm">
         <div className="flex items-center gap-2 mb-4 text-gray-500">
           <Scale className="w-5 h-5 text-purple-600" />
           <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">群体动力学指标</h3>
           <Info className="w-3 h-3 text-gray-400 ml-auto cursor-help" />
        </div>
        <div className="absolute top-12 left-5 right-5 bg-white border border-gray-200 p-3 rounded z-10 text-[10px] text-gray-600 hidden group-hover:block shadow-xl">
            <p className="mb-2"><strong className="text-purple-600">极化指数 (Esteban-Ray)</strong>: 数值越高，表示群体分裂越严重，越容易爆发冲突。低数值代表共识度高。</p>
            <p><strong className="text-emerald-600">信息熵 (Shannon)</strong>: 数值越高，表示声音越多元、混乱。数值降低意味着“回声室”效应形成，声音趋于单一。</p>
        </div>
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#333'}} itemStyle={{fontSize: 12, color: '#333'}} labelStyle={{color: '#666'}} />
                    <Area type="monotone" dataKey="极化指数 (冲突)" stroke="#9333ea" fillOpacity={0} strokeWidth={2} />
                    <Area type="monotone" dataKey="信息熵 (多样性)" stroke="#059669" fillOpacity={0} strokeWidth={2} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Real-Time Opinion Distribution (Histogram) */}
      <div className="bg-white/80 border border-gray-200 rounded-xl p-5 backdrop-blur-sm flex flex-col relative group shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-gray-500">
           <BarChart2 className="w-5 h-5 text-blue-600" />
           <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">实时观点分布</h3>
           <Info className="w-3 h-3 text-gray-400 ml-auto cursor-help" />
        </div>
        <div className="absolute top-12 left-5 right-5 bg-white border border-gray-200 p-3 rounded z-10 text-[10px] text-gray-600 hidden group-hover:block shadow-xl">
            <p>显示了当前所有用户的观点分布情况。</p>
            <p className="mt-1">左侧 <span className="text-red-500">红色</span> 为反对区域 (0-0.35)，中间 <span className="text-gray-400">灰色</span> 为中立，右侧 <span className="text-blue-500">蓝色</span> 为支持区域 (0.65-1.0)。</p>
        </div>
        
        <div className="flex-1 min-h-[160px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="range" stroke="#9ca3af" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#333'}} labelStyle={{color: '#666'}} />
                    <ReferenceLine x="0.5" stroke="#9ca3af" strokeDasharray="3 3" />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                </BarChart>
             </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between mt-2 text-[10px] text-gray-500 border-t border-gray-100 pt-2">
            <div>
               <span className="block text-red-500">平均观点: {Number(latestStats.averageOpinion).toFixed(2)}</span>
               <span className="text-[9px]">0=反对, 1=支持</span>
            </div>
            <div>
               <span className="block text-purple-600">极化度: {Number(latestStats.polarizationIndex).toFixed(2)}</span>
               <span className="text-[9px]">High = 严重对立</span>
            </div>
        </div>
      </div>

    </div>
  );
};

export default AnalysisDashboard;