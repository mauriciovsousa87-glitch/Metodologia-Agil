
import { createClient } from '@supabase/supabase-js';

// Chaves fornecidas pelo usuário para garantir conexão imediata
const URL = "https://vgniluvzwhxupapaiqon.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbmlsdXZ6d2h4dXBhcGFpcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTA4OTAsImV4cCI6MjA4MjA4Njg5MH0.GRzloJhRrBHMbCa6KVgjfyn4Cna5S7moqm6DYTPQRVI";

export const isSupabaseConfigured = URL.includes("supabase.co") && KEY.length > 20;

export const supabase = isSupabaseConfigured 
  ? createClient(URL, KEY)
  : null as any;
