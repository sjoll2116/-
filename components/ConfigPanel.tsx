import React, { useState, ChangeEvent } from 'react';
import { SimulationConfig, StrategyType, OppositionStyle } from '../types';
import { Play, Activity, Target, Zap, Swords, BrainCircuit, FileText, Globe, Link } from 'lucide-react';

interface ConfigPanelProps {
  onSimulate: (config: SimulationConfig) => void;
  isLoading: boolean;
}

const STRATEGY_LABELS: Record<StrategyType, string> = {
  [StrategyType.FOMO_INDUCTION]: "制造焦虑 (FOMO)",
  [StrategyType.LOGICAL_PERSUASION]: "逻辑说服/硬核科普",
  [StrategyType.EMOTIONAL_APPEAL]: "情感共鸣/小作文",
  [StrategyType.CONTROVERSY_GENERATION]: "制造争议/引战"
};

const OPPOSITION_LABELS: Record<OppositionStyle, string> = {
  [OppositionStyle.CHAOTIC_MIX]: "混合对抗 (受控反对派+真实舆论)",
  [OppositionStyle.FALSE_FLAG]: "反串黑/低级红 (演戏)",
  [OppositionStyle.RATIONAL_DEBATE]: "理性辩论 (硬核反对)",
  [OppositionStyle.NONE]: "无对抗"
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onSimulate, isLoading }) => {
  const [topic, setTopic] = useState('新款苹果手机发布');
  const [objective, setObjective] = useState('让用户觉得虽然贵但是物超所值');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // 爬虫配置
  const [sourceUrl, setSourceUrl] = useState('');

  const [strategy, setStrategy] = useState<StrategyType>(StrategyType.FOMO_INDUCTION);
  const [intensity, setIntensity] = useState(7);
  
  const [oppositionStyle, setOppositionStyle] = useState<OppositionStyle>(OppositionStyle.CHAOTIC_MIX);
  const [userCriticalThinking, setUserCriticalThinking] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate({
      topic,
      productOrObjective: objective,
      additionalInfo,
      sourceUrl: sourceUrl.trim() || undefined,
      strategy,
      intensity,
      oppositionStyle,
      userCriticalThinking
    });
  };

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 p-6 flex flex-col h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          舆论模拟器
        </h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">EchoChamber Simulator</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" /> 目标话题
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
            placeholder="例如：电动汽车安全性"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">引导目标 / 产品</label>
          <textarea
            value={objective}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
            rows={2}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
            placeholder="你想让群体达成什么共识？"
          />
        </div>
        
        {/* 真实数据接入配置区域 */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-3">
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
             <Globe className="w-3 h-3" /> 真实数据接入 (可选)
          </h3>
          
          <div>
             <label className="block text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
               <Link className="w-3 h-3" /> 目标帖子链接 (Source URL)
            </label>
            <input
              type="text"
              value={sourceUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)}
              className="w-full bg-white border border-blue-200 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="粘贴小红书/微博/B站帖子链接..."
            />
          </div>
          
          <p className="text-[9px] text-blue-600 leading-tight">
             输入链接后将自动调用本地爬虫工具 (端口8001)。<br/>
             若抓取成功，真实评论将直接替代第一轮模拟对话。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
             <FileText className="w-4 h-4 text-green-500" /> 额外参考信息 (可选)
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAdditionalInfo(e.target.value)}
            rows={2}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-gray-900"
            placeholder="提供更多背景给Bot参考..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">心理引导策略</label>
          <select
            value={strategy}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStrategy(e.target.value as StrategyType)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
          >
            {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> 引导强度: {intensity}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIntensity(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* 高级参数配置区域 */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">环境拟真参数</h3>
          
          <div className="mb-5">
             <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
               <Swords className="w-4 h-4 text-orange-500" /> 对抗环境
             </label>
             <select
              value={oppositionStyle}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setOppositionStyle(e.target.value as OppositionStyle)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition text-gray-900"
            >
              {Object.entries(OPPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-500" /> 
              用户独立思考: {userCriticalThinking}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={userCriticalThinking}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUserCriticalThinking(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 mt-4 ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'
          }`}
        >
          {isLoading ? (
            <span className="animate-pulse">模拟推演中...</span>
          ) : (
            <>
              <Play className="w-5 h-5" /> 开始模拟
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ConfigPanel;