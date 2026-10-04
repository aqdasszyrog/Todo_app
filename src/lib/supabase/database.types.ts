// Types for the `public` schema, in the format `supabase gen types` writes.
// Regenerate after changing a migration: `npm run db:types` (see README).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      notifications: {
        Row: {
          actor_id: string | null;
          actor_name: string | null;
          comment_count: number;
          comment_id: number | null;
          created_at: string;
          id: number;
          preview: string | null;
          read_at: string | null;
          shared_task_id: number | null;
          task_title: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_name?: string | null;
          comment_count?: number;
          comment_id?: number | null;
          created_at?: string;
          id?: never;
          preview?: string | null;
          read_at?: string | null;
          shared_task_id?: number | null;
          task_title?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          actor_name?: string | null;
          comment_count?: number;
          comment_id?: number | null;
          created_at?: string;
          id?: never;
          preview?: string | null;
          read_at?: string | null;
          shared_task_id?: number | null;
          task_title?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_shared_task_id_fkey";
            columns: ["shared_task_id"];
            isOneToOne: false;
            referencedRelation: "shared_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          name?: string | null;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      shared_task_comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: number;
          task_id: number;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: never;
          task_id: number;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: never;
          task_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shared_task_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "shared_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_task_members: {
        Row: {
          created_at: string;
          invited_by: string | null;
          responded_at: string | null;
          status: Database["public"]["Enums"]["member_status"];
          task_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          task_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["member_status"];
          task_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_task_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_task_members_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "shared_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_task_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_tasks: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: number;
          owner_id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          progress: Database["public"]["Enums"]["task_progress"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: never;
          owner_id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          progress?: Database["public"]["Enums"]["task_progress"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: never;
          owner_id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          progress?: Database["public"]["Enums"]["task_progress"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_tasks_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_tasks: {
        Row: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: number;
          priority: Database["public"]["Enums"]["task_priority"];
          progress: Database["public"]["Enums"]["task_progress"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: never;
          priority?: Database["public"]["Enums"]["task_priority"];
          progress?: Database["public"]["Enums"]["task_progress"];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: never;
          priority?: Database["public"]["Enums"]["task_priority"];
          progress?: Database["public"]["Enums"]["task_progress"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_access_shared_task: {
        Args: { p_include_invited?: boolean; p_task_id: number };
        Returns: boolean;
      };
      create_shared_task: {
        Args: {
          p_due_date: string | null;
          p_emails: string[];
          p_priority: Database["public"]["Enums"]["task_priority"];
          p_title: string;
        };
        Returns: number;
      };
      ensure_profile: { Args: never; Returns: undefined };
      find_user_by_email: {
        Args: { p_email: string };
        Returns: { email: string; id: string; name: string | null }[];
      };
      invite_to_shared_task: {
        Args: { p_email: string; p_task_id: number };
        Returns: string;
      };
      is_shared_task_owner: { Args: { p_task_id: number }; Returns: boolean };
      my_shared_tasks: {
        Args: { p_before_id?: number | null; p_limit?: number; p_task_id?: number | null };
        Returns: {
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: number;
          owner_id: string;
          people: Json;
          priority: Database["public"]["Enums"]["task_priority"];
          progress: Database["public"]["Enums"]["task_progress"];
          title: string;
          updated_at: string;
        }[];
      };
      respond_to_invite: {
        Args: { p_accept: boolean; p_task_id: number };
        Returns: undefined;
      };
      shared_task_comments_page: {
        Args: { p_before_id?: number | null; p_limit?: number; p_task_id: number };
        Returns: {
          author_id: string | null;
          author_name: string | null;
          body: string;
          created_at: string;
          id: number;
        }[];
      };
      task_summary: { Args: never; Returns: Json };
    };
    Enums: {
      member_status: "invited" | "accepted" | "declined";
      notification_type: "task_invite" | "invite_accepted" | "invite_declined" | "task_comment";
      task_priority: "low" | "medium" | "high";
      task_progress: "incomplete" | "in_progress" | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
