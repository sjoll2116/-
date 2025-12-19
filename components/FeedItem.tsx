import React from 'react';
import { AgentProfile, SimulatedPost } from '../types';
import { MessageSquare, ThumbsUp, AlertTriangle, MoreHorizontal, CornerDownRight } from 'lucide-react';

interface TiebaFloorProps {
  floorPost: SimulatedPost;
  agent: AgentProfile;
  floorIndex: number; // 楼层号
  subComments: { post: SimulatedPost; agent: AgentProfile }[]; // 楼中楼数据
}

const TiebaFloor: React.FC<TiebaFloorProps> = ({ floorPost, agent, floorIndex, subComments }) => {
  const isLZ = floorIndex === 1; // 1楼是楼主

  return (
    <div class="flex bg-[#252525] border border-[#353535] mb-[-1px] first:rounded-t-lg last:rounded-b-lg overflow-hidden font-sans">
      
      {/* 左侧：用户信息栏 */}
      <div class="w-32 bg-[#2d2d2d] flex flex-col items-center py-6 px-2 flex-shrink-0 border-r border-[#353535]">
        <div class="relative group cursor-pointer">
          <img 
            src={agent.avatarUrl} 
            alt={agent.username} 
            class="w-20 h-20 border-2 border-[#3a3a3a] p-0.5 object-cover bg-white"
          />
          {isLZ && (
            <div class="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm skew-x-[-10deg]">
              楼主
            </div>
          )}
        </div>
        
        <div class="mt-3 text-center w-full">
           <div class="text-[#8d9ab3] text-xs underline decoration-dotted mb-1 truncate px-1 font-bold">
             {agent.username}
           </div>

           {agent.isBot && (
             <div class="mt-2 text-[9px] border border-red-900/50 text-red-500 px-1 py-0.5 rounded bg-red-950/20 inline-block">
               <span class="block">疑似水军</span>
             </div>
           )}
           
           <div class="mt-4 flex gap-2 justify-center opacity-40 hover:opacity-100 transition">
             <MessageSquare class="w-3 h-3 text-gray-400" />
             <MoreHorizontal class="w-3 h-3 text-gray-400" />
           </div>
        </div>
      </div>

      {/* 右侧：内容与楼中楼 */}
      <div class="flex-1 min-w-0 p-5 flex flex-col relative">
        
        {/* 内容主体 */}
        <div class="text-[#d1d5db] text-[15px] leading-7 mb-8 min-h-[80px]">
           {floorPost.content}
           {floorPost.imageUrl && (
            <div class="mt-4 max-w-md">
              <img src={floorPost.imageUrl} class="rounded border border-gray-700 cursor-zoom-in" />
            </div>
           )}
        </div>

        {/* 底部信息栏 */}
        <div class="mt-auto flex items-center justify-between text-xs text-[#666] border-t border-[#333] pt-3">
           <div class="flex items-center gap-4">
              <span>{floorIndex}楼</span>
              <span>{floorPost.timestamp}</span>
              <span class="hover:text-[#a1a1a1] cursor-pointer">举报</span>
           </div>
           <div class="flex items-center gap-4">
              <span class="hover:text-blue-400 cursor-pointer flex items-center gap-1">
                 回复({subComments.length})
              </span>
              <span class="hover:text-blue-400 cursor-pointer">收起回复</span>
           </div>
        </div>

        {/* 楼中楼 (Nested Comments) */}
        {subComments.length > 0 && (
          <div class="mt-4 bg-[#1f1f1f] border border-[#333] p-4 rounded relative">
             <div class="absolute -top-2 left-8 w-3 h-3 bg-[#1f1f1f] border-l border-t border-[#333] rotate-45"></div>
             
             <div class="space-y-3">
               {subComments.map((sub, idx) => (
                 <div key={sub.post.id} class="flex gap-2 text-[13px] border-b border-[#2a2a2a] last:border-0 pb-2 last:pb-0">
                    <img src={sub.agent.avatarUrl} class="w-8 h-8 rounded-sm object-cover border border-[#333]" />
                    <div class="flex-1">
                       <div class="flex items-center gap-2 mb-1">
                          <span class="text-[#6d84b4] font-bold text-xs">{sub.agent.username}</span>
                          {sub.agent.isBot && <span class="text-[9px] text-red-500 bg-red-950/30 px-1 rounded">Bot</span>}
                          <span class="text-gray-600 text-[10px] ml-auto">{sub.post.timestamp}</span>
                       </div>
                       {/* Adjusted font size here: text-[13px] instead of text-xs */}
                       <div class="text-[#bbb] leading-relaxed">
                          {sub.post.replyToAgentId && (
                            <span class="text-[#555]">回复 <span class="text-[#6d84b4]">@{sub.post.replyToAgentId}</span> : </span>
                          )}
                          {sub.post.content}
                       </div>
                       <div class="flex justify-end mt-1 gap-3 text-[10px] text-[#555]">
                          <span class="hover:text-[#888] cursor-pointer">回复</span>
                          <span class="hover:text-[#888] cursor-pointer">点赞</span>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
             
             <div class="mt-3 pt-2 border-t border-[#2a2a2a] text-center">
                <button class="text-xs text-[#6d84b4] hover:underline">我也说一句</button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TiebaFloor;