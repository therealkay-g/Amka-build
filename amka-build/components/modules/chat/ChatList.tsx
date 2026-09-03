import React from "react";
import { User, Search, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ChatListProps {
  conversations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSearch: (q: string) => void;
  onStartNewChat: () => void;
  loading: boolean;
}

export function ChatList({ conversations, selectedId, onSelect, onSearch, onStartNewChat, loading }: ChatListProps) {
  return (
    <div className="flex flex-col h-full w-80 border-r border-border bg-surface-soft/30">
      <div className="p-4 border-b border-border bg-surface-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Messages</h2>
          <button
            onClick={onStartNewChat}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={14} /> Nouveau
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            className="input-field pl-10 w-full text-sm"
            placeholder="Rechercher une conversation..."
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-muted text-xs">Chargement...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted text-xs">Aucune conversation.</div>
        ) : (
          conversations.map((conv) => {
            const c = conv.conversations;
            const participants = conv.conversation_participants || [];
            const otherUser = participants.find((p: any) => p.user_id !== c.type); // Simplified

            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                  selectedId === c.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-surface-soft"
                }`}
              >
                <div className="rounded-full bg-surface-mid p-2 shrink-0">
                  <User size={18} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold text-sm truncate">
                    {c.name || "Chat Privé"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    Cliquez pour discuter
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
