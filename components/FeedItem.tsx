import React from 'react';
import { AgentProfile, SimulatedPost } from '../types';
import { MessageSquare, ThumbsUp, AlertTriangle, MoreHorizontal, CornerDownRight } from 'lucide-react';

// --- Tieba Emoji Map (Baidu CDN & Sina CDN for extended ones) ---
const TIEBA_EMOJIS: Record<string, string> = {
  // Classic Baidu 'i_f' Series
  '[滑稽]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f25.png',
  '[阴险]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f50.png',
  '[乖]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f23.png',
  '[笑眼]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f02.png',
  '[流汗]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f27.png',
  '[大哭]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f09.png',
  '[尴尬]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f11.png',
  '[怒]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f19.png',
  '[惊恐]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f26.png',
  '[疑惑]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f32.png',
  '[鄙视]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f48.png',
  '[吐舌]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f12.png',
  '[喷]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f33.png',
  '[无语]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f31.png',
  '[思考]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f29.png',
  '[酷]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f16.png',
  '[委屈]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f15.png',
  '[强]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f45.png',
  '[弱]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f46.png',
  '[握手]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f47.png',
  '[胜利]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f44.png',
  '[抱拳]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f42.png',
  '[OK]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f43.png',
  // Extended (Weibo/Common)
  '[吃瓜]': 'https://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/01/2018new_chigua_org.png',
  '[doge]': 'https://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_doge02_org.png',
  '[二哈]': 'https://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/22/2018new_erha_org.png',
  '[费解]': 'https://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2a/2018new_wenhao_org.png',
  // XHS / Other Common Emojis Mappings
  '[偷笑R]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f25.png', // Mapped to 滑稽
  '[再见R]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f31.png', // Mapped to 无语/再见
  '[泪崩R]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f09.png', // Mapped to 大哭
  '[害羞R]': 'https://gsp0.baidu.com/5aAHeD3nKhI2p27j8IqW0jdnxx1xbK/tb/editor/images/face/i_f23.png', // Mapped to 乖
};

interface TiebaFloorProps {
  floorPost: SimulatedPost;
  agent: AgentProfile;
  floorIndex: number; // 楼层号
  subComments: { post: SimulatedPost; agent: AgentProfile; replyToUsername?: string | null }[]; // 楼中楼数据
}

const TiebaFloor: React.FC<TiebaFloorProps> = ({ floorPost, agent, floorIndex, subComments }) => {
  const isLZ = floorIndex === 1; // 1楼是楼主

  // Helper to parse content:
  // 1. Replace [Code] with Images
  // 2. Format #Topic[话题]# -> Blue text #Topic
  const renderContent = (content: string) => {
    if (!content) return null;
    
    // Regex strategy:
    // 1. Match XHS style topics: #...[话题]#
    // 2. Match Emoji codes: [...]
    // We split carefully to keep delimiters
    
    const parts = content.split(/(#[^#\[]+\[话题\]#)|(\[[^\]]+\])/g).filter(p => p);
    
    return parts.map((part, index) => {
      // 1. Handle Emojis
      if (TIEBA_EMOJIS[part]) {
         return (
           <img 
             key={index} 
             src={TIEBA_EMOJIS[part]} 
             alt={part} 
             title={part}
             className="w-[24px] h-[24px] inline-block align-text-bottom mx-[1px] select-none" 
             onError={(e) => {
               (e.target as HTMLImageElement).style.display = 'none';
             }}
           />
         );
      }

      // 2. Handle XHS Topics: #xxxx[话题]#
      // We extract the 'xxxx' part and display as #xxxx in blue
      if (part.startsWith('#') && part.endsWith('[话题]#')) {
          const topicText = part.replace('[话题]#', ''); // Remove the suffix
          return (
              <span key={index} className="text-blue-600 cursor-pointer hover:underline mx-1">
                  {topicText}
              </span>
          );
      }

      // 3. Normal Text
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex bg-white border border-gray-200 mb-[-1px] first:rounded-t-lg last:rounded-b-lg overflow-hidden font-sans shadow-sm">
      
      {/* 左侧：用户信息栏 */}
      <div className="w-32 bg-[#fbfbfb] flex flex-col items-center py-6 px-2 flex-shrink-0 border-r border-gray-200">
        <div className="relative group cursor-pointer">
          <img 
            src={agent.avatarUrl} 
            alt={agent.username} 
            className="w-20 h-20 border-2 border-white shadow-sm p-0.5 object-cover bg-white"
          />
          {isLZ && (
            <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm skew-x-[-10deg]">
              楼主
            </div>
          )}
        </div>
        
        <div className="mt-3 text-center w-full">
           <div className="text-blue-700 text-xs underline decoration-dotted mb-1 truncate px-1 font-bold">
             {agent.username}
           </div>

           {agent.isBot && (
             <div className="mt-2 text-[9px] border border-red-200 text-red-600 px-1 py-0.5 rounded bg-red-50 inline-block">
               <span className="block">疑似水军</span>
             </div>
           )}
           
           <div className="mt-4 flex gap-2 justify-center opacity-40 hover:opacity-100 transition">
             <MessageSquare className="w-3 h-3 text-gray-400" />
             <MoreHorizontal className="w-3 h-3 text-gray-400" />
           </div>
        </div>
      </div>

      {/* 右侧：内容与楼中楼 */}
      <div className="flex-1 min-w-0 p-5 flex flex-col relative">
        
        {/* 内容主体 */}
        <div className="text-gray-800 text-[15px] leading-7 mb-8 min-h-[80px] whitespace-pre-wrap break-words">
           {renderContent(floorPost.content)}
           {floorPost.imageUrl && (
            <div className="mt-4 max-w-md">
              <img src={floorPost.imageUrl} className="rounded border border-gray-200 cursor-zoom-in" alt="Post attachment" />
            </div>
           )}
        </div>

        {/* 底部信息栏 */}
        <div className="mt-auto flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
           <div className="flex items-center gap-4">
              <span>{floorIndex}楼</span>
              <span>{floorPost.timestamp}</span>
              <span className="hover:text-gray-800 cursor-pointer">举报</span>
           </div>
           <div className="flex items-center gap-4">
              <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1">
                 回复({subComments.length})
              </span>
              <span className="hover:text-blue-600 cursor-pointer">收起回复</span>
           </div>
        </div>

        {/* 楼中楼 (Nested Comments) */}
        {subComments.length > 0 && (
          <div className="mt-4 bg-[#f7f8fa] border border-gray-200 p-4 rounded relative">
             <div className="absolute -top-2 left-8 w-3 h-3 bg-[#f7f8fa] border-l border-t border-gray-200 rotate-45"></div>
             
             <div className="space-y-3">
               {subComments.map((sub, idx) => (
                 <div key={sub.post.id} className="flex gap-2 text-[13px] border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                    <img src={sub.agent.avatarUrl} className="w-8 h-8 rounded-sm object-cover border border-gray-200" alt="avatar" />
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-600 font-bold text-xs">{sub.agent.username}</span>
                          {sub.agent.isBot && <span className="text-[9px] text-red-500 bg-red-50 px-1 rounded border border-red-100">Bot</span>}
                          <span className="text-gray-400 text-[10px] ml-auto">{sub.post.timestamp}</span>
                       </div>
                       
                       <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                          {sub.replyToUsername && (
                            <span className="text-gray-500">回复 <span className="text-blue-600">@{sub.replyToUsername}</span> : </span>
                          )}
                          {renderContent(sub.post.content)}
                       </div>
                       <div className="flex justify-end mt-1 gap-3 text-[10px] text-gray-400">
                          <span className="hover:text-blue-500 cursor-pointer">回复</span>
                          <span className="hover:text-blue-500 cursor-pointer">点赞</span>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
             
             <div className="mt-3 pt-2 border-t border-gray-200 text-center">
                <button className="text-xs text-blue-600 hover:underline">我也说一句</button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TiebaFloor;