// Hand-rolled DB types matching supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript` output once the project is provisioned.

export type Platform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "facebook";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type MediaType = "video" | "image";

export type ResultStatus = "success" | "failed" | "pending";

export interface ConnectedAccountRow {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  platform_username: string | null;
  platform_avatar: string | null;
  access_token: string; // ciphertext
  refresh_token: string | null; // ciphertext
  token_expires_at: string | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: MediaType | null;
  platforms: Platform[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostResultRow {
  id: string;
  post_id: string;
  platform: Platform;
  status: ResultStatus;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      connected_accounts: {
        Row: ConnectedAccountRow;
        Insert: Omit<ConnectedAccountRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ConnectedAccountRow, "id">>;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: Omit<PostRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PostRow, "id">>;
        Relationships: [];
      };
      post_results: {
        Row: PostResultRow;
        Insert: Omit<PostResultRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<PostResultRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
