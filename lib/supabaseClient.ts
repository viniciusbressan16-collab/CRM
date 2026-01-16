import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = 'https://hwrvrppmhuyxhxsvkfke.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3cnZycHBtaHV5eGh4c3ZrZmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjk3MzAsImV4cCI6MjA4MzkwNTczMH0.nBcPgyVuoRx2xVbInG9FYHHLgf95BvKb1r4txqJ7WZ0'

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
