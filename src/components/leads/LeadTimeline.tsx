import { motion } from 'motion/react';
import { 
  History, 
  User, 
  ArrowRightLeft, 
  CheckCircle2, 
  Calendar,
  Tag as TagIcon,
  MessageCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TimelineItem {
  id: string;
  type: 'status' | 'task' | 'interaction' | 'creation' | 'system';
  title: string;
  description: string;
  user: string;
  date: string;
}

export default function LeadTimeline({ leadName, items = [] }: { leadName: string; items?: TimelineItem[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'status': return <ArrowRightLeft className="w-3.5 h-3.5" />;
      case 'task': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'interaction': return <MessageCircle className="w-3.5 h-3.5" />;
      case 'creation': return <User className="w-3.5 h-3.5" />;
      default: return <History className="w-3.5 h-3.5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'status': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400';
      case 'task': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'interaction': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400';
      case 'creation': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
          <History size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider leading-none">Linha do Tempo</h3>
          <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px]">{leadName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <History size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum evento registrado</p>
            <p className="text-[10px] text-slate-400 mt-0.5">As interações e alterações de status aparecerão aqui.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-6 space-y-8">
            {items.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={item.id} 
                className="relative"
              >
                <div className={cn(
                  "absolute -left-[33px] top-0 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white dark:border-slate-900",
                  getColor(item.type)
                )}>
                  {getIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">{item.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user}`} alt="User" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{item.user}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
