
import { createClient } from '@supabase/supabase-js';

// Fallback com as chaves que você forneceu para garantir que o app funcione imediatamente
const DEFAULT_URL = "https://vgniluvzwhxupapaiqon.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbmlsdXZ6d2h4dXBhcGFpcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTA4OTAsImV4cCI6MjA4MjA4Njg5MH0.GRzloJhRrBHMbCa6KVgjfyn4Cna5S7moqm6DYTPQRVI";

const getEnv = (name: string) => {
  try {
    return (import.meta as any).env?.[name] || (globalThis as any).process?.env?.[name] || "";
  } catch {
    return "";
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || DEFAULT_URL;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || DEFAULT_KEY;

export const isSupabaseConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 10;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;
