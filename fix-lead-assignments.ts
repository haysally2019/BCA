import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixLeadAssignments() {
  console.log('\n=== Fixing Lead Assignments ===\n');
  
  console.log('This script will:');
  console.log('1. Get all current user profiles');
  console.log('2. Get all leads and their current company_id assignments');
  console.log('3. Reassign leads evenly to current profiles');
  console.log('');
  
  // Try to get auth users (this won't work with anon key but let's try)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.log('Cannot access auth users with anon key (expected)');
    console.log('Error:', authError.message);
    console.log('');
    console.log('SOLUTION: You need to run this script with the SERVICE_ROLE key');
    console.log('Please add to your .env file:');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.log('');
    console.log('Then modify this script to use it.');
    return;
  }
  
  console.log('Found', authUsers.users.length, 'auth users');
}

fixLeadAssignments().catch(console.error);
