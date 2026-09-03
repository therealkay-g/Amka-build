import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Image as ImageIcon, Video, Paperclip, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sendMessage } from "@/lib/messaging";
import { formatMoney } from "@/lib/utils";
import { VoiceRecorder } from "./VoiceRecorder";

interface ChatWindowProps {
  conversationId: string;
  userId: string;
  userName: string;
  messages: any[];
  onSendMessage: (content: string, type: 'text' | 'audio' | 'video' | 'image', fileUrl?: string) => void;
  loading: boolean;
}

export function ChatWindow({ conversationId, userId, userName, messages, onSendMessage, loading }: ChatWindowProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text, 'text');
    setText("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface-soft/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {userName.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-text text-sm">{userName}</h3>
            <p className="text-[10px] text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> En ligne
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            Démarrez la conversation avec {userName}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                  isMe
                    ? "bg-primary text-white rounded-tr-none"
                    : "bg-surface-soft text-text border border-border rounded-tl-none"
                }`}>
                  {msg.message_type === 'text' && (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}

                  {msg.message_type === 'audio' && (
                    <div className="flex items-center gap-2">
                      <audio
                        src={msg.file_url}
                        controls
                        className="h-8 w-48 scale-90 origin-left"
                      />
                      <span className="text-[10px] opacity-70">Vocal</span>
                    </div>
                  )}

                  {msg.message_type === 'video' && (
                    <div className="space-y-2">
                      <video
                        src={msg.file_url}
                        controls
                        className="rounded-lg max-w-full h-auto"
                      />
                      <p className="text-[10px] opacity-70 text-center">Vidéo</p>
                    </div>
                  )}

                  {msg.message_type === 'image' && (
                    <img
                      src={msg.file_url}
                      alt="shared"
                      className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                    />
                  )}

                  <p className={`text-[9px] mt-1 text-right ${isMe ? "text-white/70" : "text-muted"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-surface-soft">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-muted hover:bg-surface-mid transition" title="Image">
            <ImageIcon size={20} />
          </button>
          <button className="p-2 rounded-full text-muted hover:bg-surface-mid transition" title="Vidéo">
            <Video size={20} />
          </button>

          <div className="flex-1 relative">
            <input
              className="input-field w-full pr-10"
              placeholder="Écrire un message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
          </div>

          {isRecording ? (
             <div className="flex items-center gap-2 text-error animate-pulse font-bold text-xs mr-2">
               Enregistrement...
             </div>
          ) : (
            <VoiceRecorder
              onRecordingStarted={() => setIsRecording(true)}
              onRecordingStopped={(blob) => {
                setIsRecording(false);
                // The VoiceRecorder will handle the upload and call onSendMessage
              }}
              onMessageSent={(content, url) => onSendMessage(content, 'audio', url)}
            />
          )}

          <button
            onClick={handleSend}
            disabled={!text.trim() && !isRecording}
            className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
