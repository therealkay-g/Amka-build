export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          role?: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          email?: string
          first_name?: string
          last_name?: string
          role?: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          role?: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          email?: string
          first_name?: string
          last_name?: string
          role?: 'ADMIN' | 'RECEPTIONIST' | 'MEDECIN_DIRECTEUR' | 'PERCEPTEUR' | 'PHARMACIEN' | 'COMPTABLE'
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          numero_dossier: string
          nom: string
          prenom: string
          postnom: string | null
          sexe: 'MASCULIN' | 'FEMININ'
          date_naissance: string
          telephone: string | null
          adresse: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          numero_dossier: string
          nom: string
          prenom: string
          postnom?: string | null
          sexe: 'MASCULIN' | 'FEMININ'
          date_naissance: string
          telephone?: string | null
          adresse?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          numero_dossier?: string
          nom?: string
          prenom?: string
          postnom?: string | null
          sexe?: 'MASCULIN' | 'FEMININ'
          date_naissance?: string
          telephone?: string | null
          adresse?: string | null
          is_active?: boolean | null
          updated_at?: string | null
        }
      }
      consultations: {
        Row: {
          id: string
          patient_id: string
          medecin_id: string
          motif: string
          diagnostic: string | null
          tension: string | null
          temperature: number | null
          poids: number | null
          traitement: string | null
          notes: string | null
          status: 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
          date_consultation: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          medecin_id: string
          motif: string
          diagnostic?: string | null
          tension?: string | null
          temperature?: number | null
          poids?: number | null
          traitement?: string | null
          notes?: string | null
          status?: 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
          date_consultation?: string | null
          created_at?: string | null
        }
        Update: {
          patient_id?: string
          medecin_id?: string
          motif?: string
          diagnostic?: string | null
          tension?: string | null
          temperature?: number | null
          poids?: number | null
          traitement?: string | null
          notes?: string | null
          status?: 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'
          date_consultation?: string | null
          created_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          patient_id: string
          collected_by: string | null
          montant: number
          type: string
          mode_paiement: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'INSURANCE'
          status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          collected_by?: string | null
          montant: number
          type: string
          mode_paiement: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'INSURANCE'
          status?: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          patient_id?: string
          collected_by?: string | null
          montant?: number
          type?: string
          mode_paiement?: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'INSURANCE'
          status?: 'PENDING' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          created_at?: string | null
        }
      }
      medications: {
        Row: {
          id: string
          name: string
          category: string
          unit: string
          price: number
          stock: number | null
          threshold: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          unit: string
          price: number
          stock?: number | null
          threshold?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          name?: string
          category?: string
          unit?: string
          price?: number
          stock?: number | null
          threshold?: number | null
          is_active?: boolean | null
          updated_at?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          medication_id: string
          patient_id: string | null
          sold_by: string | null
          quantity: number
          unit_price: number
          total_price: number
          sold_at: string | null
        }
        Insert: {
          id?: string
          medication_id: string
          patient_id?: string | null
          sold_by?: string | null
          quantity: number
          unit_price: number
          total_price: number
          sold_at?: string | null
        }
        Update: {
          medication_id?: string
          patient_id?: string | null
          sold_by?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          sold_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: string
          date: string
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: string
          date: string
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          description?: string
          amount?: number
          category?: string
          date?: string
          created_by?: string | null
          created_at?: string | null
        }
      },
      conversations: {
        Row: {
          id: string
          name: string | null
          type: 'private' | 'group'
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          type: 'private' | 'group'
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          name?: string | null
          type?: 'private' | 'group'
          updated_at?: string | null
        }
      },
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
          joined_at: string | null
          last_read_at: string | null
        }
        Insert: {
          conversation_id: string
          user_id: string
          joined_at?: string | null
          last_read_at?: string | null
        }
        Update: {
          joined_at?: string | null
          last_read_at?: string | null
        }
      },
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string | null
          message_type: 'text' | 'audio' | 'video' | 'image'
          file_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content?: string | null
          message_type: 'text' | 'audio' | 'video' | 'image'
          file_url?: string | null
          created_at?: string | null
        }
        Update: {
          content?: string | null
          message_type?: 'text' | 'audio' | 'video' | 'image'
          file_url?: string | null
        }
      }
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
  }
}
