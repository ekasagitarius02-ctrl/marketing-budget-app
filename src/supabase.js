import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gajdgloeudxyliogmwdl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhamRnbG9ldWR4eWxpb2dtd2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDMwNzMsImV4cCI6MjEwMDg3OTA3M30.w8S_TuZkRf1CLzKzWLtporKzM3s7r3K4IUuYQR59rrE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
