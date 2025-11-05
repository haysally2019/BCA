import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLeadDistribution() {
  console.log('\n=== Checking Lead Distribution ===\n');
  
  const { data: leads, error } = await supabase
    .from('leads')
    .select('company_id')
    .limit(100);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log('Sample of first 100 leads:');
  console.log('Total sampled:', leads ? leads.length : 0);
  
  if (leads && leads.length > 0) {
    const companyIds = new Set();
    leads.forEach(lead => {
      if (lead.company_id) {
        companyIds.add(lead.company_id);
      }
    });
    
    console.log('\nUnique company_id values in sample:', companyIds.size);
    console.log('\nCompany IDs found:');
    Array.from(companyIds).slice(0, 10).forEach(id => {
      console.log('  - ' + id);
    });
  }
  
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });
  
  console.log('\nTotal leads in database:', count || 0);
}

checkLeadDistribution().catch(console.error);
