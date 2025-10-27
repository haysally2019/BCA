import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Profile {
  id: string;
  full_name: string;
  company_email: string;
  personal_phone?: string;
  affiliatewp_id: number | null;
}

async function createAffiliateAccounts() {
  console.log('🚀 Starting batch AffiliateWP account creation...\n');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, company_email, personal_phone, affiliatewp_id')
    .is('affiliatewp_id', null)
    .not('company_email', 'is', null)
    .not('full_name', 'is', null)
    .order('created_at');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  console.log(`📋 Found ${profiles.length} users without AffiliateWP accounts\n`);

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-affiliatewp-account`;

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    console.log(`\n[${i + 1}/${profiles.length}] Processing: ${profile.full_name} (${profile.company_email})`);

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_id: profile.id,
          email: profile.company_email,
          name: profile.full_name,
          phone: profile.personal_phone,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.skipped) {
          console.log(`⏭️  Skipped (already has account)`);
          skippedCount++;
        } else {
          console.log(`✅ Success! AffiliateWP ID: ${result.affiliatewp_id}`);
          successCount++;
        }
      } else {
        console.error(`❌ Failed: ${result.error}`);
        errorCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      console.error(`❌ Exception:`, err);
      errorCount++;
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('📊 BATCH PROCESSING COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Successfully created: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📋 Total processed: ${profiles.length}`);
  console.log('═══════════════════════════════════════\n');
}

createAffiliateAccounts().catch(console.error);
