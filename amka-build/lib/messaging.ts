import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types/database";

export type MessageType = 'text' | 'audio' | 'video' | 'image';

export async function createPrivateConversation(userId1: string, userId2: string) {
  // Fetch existing private conversations for userId1
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId1);

  if (participants) {
    for (const p of participants) {
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", p.conversation_id)
        .neq("user_id", userId1)
        .single();

      if (otherParticipant?.user_id === userId2) {
        return { conversationId: p.conversation_id };
      }
    }
  }

  // No existing conversation, create a new one
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .insert({ type: "private" })
    .select()
    .single();

  if (convError) throw convError;

  // Add both users as participants
  await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: userId1 },
    { conversation_id: conv.id, user_id: userId2 },
  ]);

  return { conversationId: conv.id };
}

export async function sendMessage(payload: {
  conversationId: string;
  senderId: string;
  content: string | null;
  type: MessageType;
  fileUrl?: string;
}) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: payload.conversationId,
      sender_id: payload.senderId,
      content: payload.content,
      message_type: payload.type,
      file_url: payload.fileUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationsForUser(userId: string) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id,
      conversations (
        id,
        name,
        type,
        updated_at
      ),
      conversation_participants!inner (
        user_id,
        profiles (
          first_name,
          last_name,
          role
        )
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}
