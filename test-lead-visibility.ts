import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLeadVisibility() {
  console.log('\n=== Testing Lead Visibility ===\n');
  
  const testCompanyId = '001a3cdc-e548-4a36-8d3f-12230abde342';
  
  console.log('Testing with company_id:', testCompanyId);
  
  const { data: leads, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('company_id', testCompanyId)
    .limit(5);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log('\nLeads found:', count || 0);
  console.log('\nFirst 5 leads:');
  if (leads && leads.length > 0) {
    leads.forEach((lead, index) => {
      console.log((index + 1) + '. ' + lead.name + ' - ' + lead.phone + ' - ' + lead.status);
    });
  }
  
  console.log('\nChecking if leads are publicly readable...');
  const { data: publicLeads, error: publicError } = await supabase
    .from('leads')
    .select('id, name, phone, status')
    .limit(10);
  
  if (publicError) {
    console.log('Public read error:', publicError.message);
  } else {
    console.log('Public read SUCCESS - found', publicLeads ? publicLeads.length : 0, 'leads');
  }
}

testLeadVisibility().catch(console.error);
