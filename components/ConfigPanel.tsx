import React, { useState, ChangeEvent } from 'react';
import { SimulationConfig, StrategyType, OppositionStyle } from '../types';
import { Play, Activity, Target, Zap, Swords, BrainCircuit } from 'lucide-react';

interface ConfigPanelProps {
  onSimulate: (config: SimulationConfig) => void;
  isLoading: boolean;
}

const STRATEGY_LABELS: Record<StrategyType, string> = {
  [StrategyType.FOMO_INDUCTION]: "制造焦虑 (FOMO)",
  [StrategyType.LOGICAL_PERSUASION]: "逻辑说服/硬核科普",
  [StrategyType.EMOTIONAL_APPEAL]: "情感共鸣/小作文",
  [StrategyType.CONTROVERSY_GENERATION]: "制造争议/引战",
  [StrategyType.MEMETIC_WARFARE]: "模因战/梗图传播"
};

const OPPOSITION_LABELS: Record<OppositionStyle, string> = {
  [OppositionStyle.CHAOTIC_MIX]: "混合对抗 (受控反对派+真实舆论)",
  [OppositionStyle.RATIONAL_DEBATE]: "理性反对派 (高难度)",
  [OppositionStyle.FALSE_FLAG]: "反串黑/低级红 (演戏)",
  [OppositionStyle.NONE]: "无对抗"
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onSimulate, isLoading }) => {
  const [topic, setTopic] = useState('新款 VR 头显发布');
  const [objective, setObjective] = useState('让用户觉得虽然贵但是物超所值，如果不买就落伍了');
  const [strategy, setStrategy] = useState<StrategyType>(StrategyType.FOMO_INDUCTION);
  const [intensity, setIntensity] = useState(7);
  
  // New State
  const [oppositionStyle, setOppositionStyle] = useState<OppositionStyle>(OppositionStyle.CHAOTIC_MIX);
  const [userCriticalThinking, setUserCriticalThinking] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSimulate({
      topic,
      productOrObjective: objective,
      strategy,
      intensity,
      oppositionStyle,
      userCriticalThinking
    });
  };

  return (
    <div class="w-full md:w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-full overflow-y-auto">
      <div class="mb-8">
        <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
          <Activity class="w-6 h-6 text-blue-400" />
          舆论模拟器
        </h1>
        <p class="text-xs text-gray-500 mt-1 uppercase tracking-widest">EchoChamber Simulator</p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-6 flex-1">
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <Target class="w-4 h-4" /> 目标话题
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
            class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="例如：电动汽车安全性"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">引导目标 / 产品</label>
          <textarea
            value={objective}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
            rows={3}
            class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="你想让群体达成什么共识？"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2">心理引导策略</label>
          <select
            value={strategy}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStrategy(e.target.value as StrategyType)}
            class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-300"
          >
            {Object.entries(STRATEGY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <Zap class="w-4 h-4" /> 引导强度: {intensity}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={intensity}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIntensity(parseInt(e.target.value))}
            class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* New Advanced Section */}
        <div class="border-t border-gray-800 pt-4 mt-2">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">环境拟真参数</h3>
          
          <div class="mb-5">
             <label class="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
               <Swords class="w-4 h-4 text-orange-400" /> 对抗环境
             </label>
             <select
              value={oppositionStyle}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setOppositionStyle(e.target.value as OppositionStyle)}
              class="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition text-gray-300"
            >
              {Object.entries(OPPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div class="text-[10px] text-gray-500 mt-2 px-1 leading-relaxed">
              * 混合对抗：包含 "受控反对派" Bot，它们会引用真实搜索到的反方观点，随后被说服转化，以制造"弃暗投明"效应。
            </div>
          </div>

          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <BrainCircuit class="w-4 h-4 text-purple-400" /> 
              用户独立思考: {userCriticalThinking}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={userCriticalThinking}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUserCriticalThinking(parseInt(e.target.value))}
              class="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div class="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>乌合之众 (易煽动)</span>
              <span>独立思考 (难忽悠)</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          class={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 mt-4 ${
            isLoading 
              ? 'bg-gray-800 cursor-not-allowed opacity-50' 
              : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.02]'
          }`}
        >
          {isLoading ? (
            <span class="animate-pulse">模拟推演中...</span>
          ) : (
            <>
              <Play class="w-5 h-5" /> 开始模拟
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ConfigPanel;