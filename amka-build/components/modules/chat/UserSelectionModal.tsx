"use client";

import React, { useState, useEffect } from "react";
import { Search, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { displayRole } from "@/lib/utils";

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userId: string) => void;
  currentUserId: string;
}

export function UserSelectionModal({ isOpen, onClose, onSelect, currentUserId }: UserSelectionModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchUsers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .neq("id", currentUserId)
          .order("first_name", { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching users for selection:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchUsers();
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    displayRole(u.role).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-border bg-surface-soft flex items-center justify-between">
          <h3 className="text-lg font-bold text-text">Nouvelle discussion</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 text-muted">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input-field pl-10 w-full text-sm"
              placeholder="Rechercher un collègue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {loading ? (
              <div className="p-8 text-center text-muted text-sm">Chargement des utilisateurs...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">Aucun utilisateur trouvé.</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSelect(user.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition text-left hover:bg-primary/5 hover:text-primary group"
                >
                  <div className="rounded-full bg-surface-mid p-2 shrink-0 group-hover:bg-primary/20 transition-colors">
                    <User size={18} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-sm truncate">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted truncate">{displayRole(user.role)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
