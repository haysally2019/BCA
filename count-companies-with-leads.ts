import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function countCompaniesWithLeads() {
  console.log('\n=== Counting Companies with Leads ===\n');
  
  const { data: allLeads, error } = await supabase
    .from('leads')
    .select('company_id');

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  if (!allLeads || allLeads.length === 0) {
    console.log('No leads found');
    return;
  }

  const companyMap = new Map();
  
  allLeads.forEach(lead => {
    if (lead.company_id) {
      const count = companyMap.get(lead.company_id) || 0;
      companyMap.set(lead.company_id, count + 1);
    }
  });

  console.log('Total leads:', allLeads.length);
  console.log('Total unique companies with leads:', companyMap.size);
  console.log('\nLeads per company:');
  
  let index = 1;
  for (const [companyId, count] of companyMap) {
    console.log(index + '. Company ' + companyId.substring(0, 8) + '...: ' + count + ' leads');
    index++;
  }
}

countCompaniesWithLeads().catch(console.error);
