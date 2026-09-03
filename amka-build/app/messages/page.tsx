"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, User, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useServiceModule } from "@/lib/hooks/useServiceModule"; // Just for profile, or use a dedicated hook
import { getConversationsForUser, sendMessage, createPrivateConversation } from "@/lib/messaging";
import { supabase } from "@/lib/supabase";
import { ChatList } from "@/components/modules/chat/ChatList";
import { ChatWindow } from "@/components/modules/chat/ChatWindow";
import { UserSelectionModal } from "@/components/modules/chat/UserSelectionModal";

export default function MessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserSelectionOpen, setIsUserSelectionOpen] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadConversations();
      setLoading(false);
    }
    void init();
  }, []);

  const loadConversations = async () => {
    if (!userId) return;
    try {
      const data = await getConversationsForUser(userId);
      setConversations(data);
    } catch (e) {
      console.error("Error loading conversations:", e);
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`chat:${selectedConversation.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConversation.id}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedConversation]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, []);

  const handleSelectConversation = async (id: string) => {
    const conv = conversations.find(c => c.conversation_id === id || c.id === id);
    setSelectedConversation(conv);
    await loadMessages(id);
  };

  const handleSendMessage = async (content: string, type: 'text' | 'audio' | 'video' | 'image', fileUrl?: string) => {
    if (!selectedConversation || !userId) return;
    try {
      await sendMessage({
        conversationId: selectedConversation.id || selectedConversation.conversation_id,
        senderId: userId,
        content,
        type,
        fileUrl,
      });
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const handleStartNewChat = async (targetUserId: string) => {
    if (!userId) return;
    const { conversationId } = await createPrivateConversation(userId, targetUserId);
    setSelectedConversation({ id: conversationId });
    await loadMessages(conversationId);
  };

  const filteredConversations = conversations.filter(c =>
    (c.conversations?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const body = (
    <>
      <PageHeader
        title="Messagerie Interne"
        subtitle="Communiquez instantanément avec vos collègues"
        icon={User}
        actions={null}
      />

      <div className="flex h-[calc(100vh-180px)] bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <ChatList
          conversations={filteredConversations}
          selectedId={selectedConversation?.id || selectedConversation?.conversation_id || null}
          onSelect={handleSelectConversation}
          onSearch={setSearchQuery}
          onStartNewChat={() => setIsUserSelectionOpen(true)}
          loading={loading}
        />

        <div className="flex-1">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation.id || selectedConversation.conversation_id}
              userId={userId || ""}
              userName={selectedConversation.conversations?.name || "Collègue"}
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={loading}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-soft flex items-center justify-center mb-4">
                <User size={40} className="text-muted/50" />
              </div>
              <h3 className="text-lg font-bold text-text">Aucune conversation sélectionnée</h3>
              <p className="max-w-xs text-sm">
                Sélectionnez un collègue dans la liste ou démarrez une nouvelle discussion pour commencer à communiquer.
              </p>
            </div>
          )}
        </div>
      </div>
      <UserSelectionModal
        isOpen={isUserSelectionOpen}
        onClose={() => setIsUserSelectionOpen(false)}
        onSelect={handleStartNewChat}
        currentUserId={userId || ""}
      />
    </>
  );

  return <AppShell>{body}</AppShell>;
}
