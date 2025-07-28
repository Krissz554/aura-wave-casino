import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle, Crown, Shield, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ClickableUsername from '@/components/ClickableUsername';
import { UserLevelDisplay } from '@/components/UserLevelDisplay';
import { ProfileBorder } from '@/components/ProfileBorder';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  user_level: number;
  created_at: string;
}

export const RealtimeChat = () => {
  const { user } = useAuth();
  const { userData } = useUserProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial messages
    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          // Auto scroll after a slight delay to ensure DOM is updated
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages((data as unknown as ChatMessage[]) || []);
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !userData || loading) return;

    // Import validation function
    const { validateChatMessage } = await import('@/lib/utils');
    const validation = validateChatMessage(newMessage);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid Message",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          user_id: user.id,
          username: userData.username,
          message: validation.sanitized,
          user_level: userData.current_level
        });

      if (error) throw error;
      
      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserBadge = (level: number) => {
    if (level >= 50) return { icon: Crown, color: 'text-yellow-400', label: 'VIP' };
    if (level >= 25) return { icon: Shield, color: 'text-purple-400', label: 'Elite' };
    if (level >= 10) return { icon: Star, color: 'text-blue-400', label: 'Pro' };
    return null;
  };

  return (
    <div className="w-full h-full relative overflow-hidden group">
      {/* Cyberpunk Background with Advanced Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl" />
      
      {/* Animated Circuit Board Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
      </div>
      
      {/* Animated Border Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-sm group-hover:blur-md transition-all duration-500" />
      
      {/* Scan Line Effects */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-cyber-scan-horizontal" />
        <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/40 to-transparent animate-cyber-scan left-1/4" />
      </div>
      
      {/* Tech Corner Details */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/60" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent/60" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent/60" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/60" />
      
      {/* Main Content Container */}
      <Card className="relative z-10 w-full h-full bg-transparent border-0 flex flex-col">
        <CardHeader className="pb-3 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <div className="absolute inset-0 animate-ping">
                  <MessageCircle className="w-5 h-5 text-primary/40" />
                </div>
              </div>
              <span className="text-white font-bold drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                Live Chat
              </span>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-400 animate-pulse drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' 
                  : 'bg-red-400 animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]'
              }`} />
            </CardTitle>
                           <div className="flex items-center gap-2">
               <div className="text-xs font-mono text-slate-300">
                 {messages.length} messages
               </div>
              {/* Tech indicator */}
              <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
            </div>
          </div>
        </CardHeader>
      
      <CardContent className="p-0 h-full flex flex-col">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-3 pb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center relative">
                  <div className="relative mb-4">
                    <MessageCircle className="w-12 h-12 mx-auto text-primary/60 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                    <div className="absolute inset-0 animate-ping">
                      <MessageCircle className="w-12 h-12 mx-auto text-primary/20" />
                    </div>
                  </div>
                  <p className="text-white font-mono text-sm drop-shadow-lg">
                    No messages yet. Start the conversation!
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    <span className="text-xs text-slate-300 font-mono">AWAITING TRANSMISSION</span>
                    <div className="w-1 h-1 bg-accent rounded-full animate-pulse delay-500" />
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const badge = getUserBadge(msg.user_level);
                const isOwnMessage = msg.user_id === user?.id;
                
                return (
                  <div key={msg.id} className={`flex gap-3 items-start animate-fade-in ${isOwnMessage ? 'flex-row-reverse' : ''} group/message relative`}>
                    {/* Message glow effect on hover */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 rounded-xl opacity-0 group-hover/message:opacity-100 transition-all duration-300 blur-sm" />
                    
                    <div className="flex-shrink-0 mt-0.5 relative z-10">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-sm opacity-0 group-hover/message:opacity-100 transition-all duration-300" />
                        <ProfileBorder level={msg.user_level} size="sm">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                              {msg.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </ProfileBorder>
                      </div>
                    </div>
                    
                     <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} min-w-0 max-w-full relative z-10`}>
                        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''} flex-wrap`}>
                          <ClickableUsername 
                            username={msg.username}
                            className={`font-medium text-xs ${
                              isOwnMessage 
                                ? 'text-blue-300 drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]' 
                                : 'text-slate-200'
                            } truncate max-w-20 font-mono`}
                          >
                            {msg.username}
                          </ClickableUsername>
                         <Badge variant="outline" className={`text-xs px-1.5 py-0.5 text-[9px] font-mono border ${
                           isOwnMessage 
                             ? 'border-blue-400/60 bg-blue-900/40 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                             : 'border-emerald-400/60 bg-emerald-900/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                         } rounded-md`}>
                           L{msg.user_level}
                         </Badge>
                         {badge && (
                           <div className={`flex items-center gap-1 text-xs ${badge.color} drop-shadow-[0_0_4px_currentColor]`}>
                             <badge.icon className="w-3 h-3" />
                           </div>
                         )}
                       </div>
                      
                      <div className={`relative p-3 rounded-lg text-xs break-words max-w-[85%] overflow-hidden ${
                        isOwnMessage 
                          ? 'bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border border-primary/40' 
                          : 'bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-800/20 border border-slate-600/30'
                      }`}>
                        {/* Message background effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover/message:opacity-100 transition-opacity duration-300" />
                        
                        <span className={`relative z-10 ${isOwnMessage ? 'text-white' : 'text-slate-100'} drop-shadow-sm`}>
                          {msg.message}
                        </span>
                        
                        {/* Tech corner accents */}
                        <div className="absolute top-1 left-1 w-1 h-1 border-l border-t border-primary/40" />
                        <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-accent/40" />
                      </div>
                      
                                             <div className="text-[10px] text-slate-400 mt-1 font-mono">
                         {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                       </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-primary/20">
          {user ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1 group/input">
                  {/* Input background effects */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-lg blur-sm opacity-0 group-focus-within/input:opacity-100 transition-all duration-300" />
                  
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={loading}
                    className="relative bg-slate-800/50 border border-slate-600/30 text-white placeholder:text-slate-400 focus:border-primary/60 focus:bg-slate-800/70 transition-all duration-300 font-mono text-sm"
                    maxLength={100}
                  />
                  
                  {/* Tech corner accents for input */}
                  <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/40 opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/40 opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                </div>
                
                <div className="relative group/send">
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || loading}
                    className="relative overflow-hidden border border-primary/40 bg-slate-900/30 hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Cyberpunk scan line effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/send:translate-x-[100%] transition-transform duration-700 ease-out" />
                    
                    {/* Subtle inner glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover/send:opacity-100 transition-opacity duration-300" />
                    
                    {/* Edge pulse effect */}
                    <div className="absolute inset-0 border border-primary/0 group-hover/send:border-primary/30 rounded-md transition-all duration-300" />
                    
                    {loading ? (
                      <div className="w-4 h-4 flex items-center justify-center relative z-10">
                        <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : (
                      <Send className="w-4 h-4 text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] relative z-10" />
                    )}
                    
                    {/* Tech corner indicators */}
                    <div className="absolute top-1 left-1 w-1 h-1 border-l border-t border-primary/60 group-hover/send:border-primary" />
                    <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-accent/60 group-hover/send:border-accent" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-300 font-mono">TRANSMISSION READY</span>
                </div>
                <span className={`text-xs font-mono ${
                  newMessage.length > 90 
                    ? 'text-red-400' 
                    : newMessage.length > 80 
                      ? 'text-yellow-400' 
                      : 'text-slate-300'
                }`}>
                  {newMessage.length}/100
                </span>
              </div>
            </div>
          ) : (
            <div className="relative text-center py-4">
              {/* Background effects for sign-in prompt */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-slate-800/30 to-slate-900/50 rounded-lg" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/20 to-primary/10 rounded-lg blur-sm" />
              
              <div className="relative z-10 space-y-2">
                                 <div className="flex items-center justify-center gap-2">
                   <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                   <p className="text-sm text-white font-mono drop-shadow-lg tracking-wider">
                     <Shield className="inline w-4 h-4 mr-2" />
                     AUTHENTICATION_REQUIRED
                   </p>
                   <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-500" />
                 </div>
                 <p className="text-xs text-slate-300 font-mono tracking-wide">
                   ESTABLISH_CONNECTION_TO_NETWORK_PROTOCOL
                 </p>
                
                {/* Tech accent lines */}
                <div className="absolute top-2 left-2 w-3 h-px bg-gradient-to-r from-primary to-transparent" />
                <div className="absolute top-2 right-2 w-3 h-px bg-gradient-to-l from-accent to-transparent" />
                <div className="absolute bottom-2 left-2 w-3 h-px bg-gradient-to-r from-accent to-transparent" />
                <div className="absolute bottom-2 right-2 w-3 h-px bg-gradient-to-l from-primary to-transparent" />
              </div>
            </div>
          )}
        </div>
              </CardContent>
      </Card>
    </div>
  );
};