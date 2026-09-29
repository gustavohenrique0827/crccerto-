import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu assistente IA. Posso analisar leads, clínicas, campanhas e conversões em tempo real. O que você gostaria de saber?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um erro ao processar sua solicitação. Verifique sua chave da API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'assistant' ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
              )}>
                {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.role === 'assistant' 
                  ? "bg-white text-slate-700 rounded-tl-none border border-slate-100" 
                  : "bg-blue-600 text-white rounded-tr-none"
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mr-auto"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre seus leads, conversões ou desempenho..."
            className="flex-1 px-4 py-3 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-md shadow-blue-200"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium uppercase tracking-widest">
          IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
