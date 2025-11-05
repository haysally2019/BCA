import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  console.log('\n=== Checking Profiles Table ===\n');
  
  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('id, user_id, company_name, is_active, user_role, created_at')
    .order('created_at', { ascending: true });

  if (allError) {
    console.error('Error fetching profiles:', allError);
    return;
  }

  const profileCount = allProfiles ? allProfiles.length : 0;
  console.log('Total profiles: ' + profileCount + '\n');
  
  if (allProfiles && allProfiles.length > 0) {
    console.log('All Profiles:');
    allProfiles.forEach((profile, index) => {
      console.log((index + 1) + '. ' + profile.company_name);
      console.log('   Profile ID: ' + profile.id);
      console.log('   User ID: ' + profile.user_id);
      console.log('   Role: ' + profile.user_role);
      console.log('   Active: ' + profile.is_active);
      console.log('');
    });
  }

  const { data: activeProfiles, error: activeError } = await supabase
    .from('profiles')
    .select('id, company_name')
    .eq('is_active', true);

  const activeCount = activeProfiles ? activeProfiles.length : 0;
  console.log('\nActive profiles: ' + activeCount);
  
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal leads in database: ' + (leadsCount || 0));
  
  if (allProfiles && allProfiles.length > 0) {
    console.log('\n=== Leads per Profile ===\n');
    for (const profile of allProfiles) {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.id);
      
      console.log(profile.company_name + ': ' + (count || 0) + ' leads');
    }
  }
}

checkUsers().catch(console.error);
