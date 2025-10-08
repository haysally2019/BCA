import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-affiliatewp-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AffiliateWPWebhookPayload {
  action: string;
  referral_id: number;
  affiliate_id: number;
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_id: number;
  order_total: number;
  commission_amount: number;
  commission_rate: number;
  commission_type: 'upfront' | 'residual';
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
  [key: string]: any;
}

interface WebhookLog {
  webhook_type: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  retry_count: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const receivedSignature = signature.replace('sha256=', '');
    
    return expectedHex === receivedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function logWebhook(payload: any, processed: boolean = false, errorMessage?: string): Promise<void> {
  try {
    const webhookLog: WebhookLog = {
      webhook_type: 'affiliatewp',
      payload,
      processed,
      error_message: errorMessage,
      retry_count: 0
    };

    const { error } = await supabase
      .from('webhook_logs')
      .insert(webhookLog);

    if (error) {
      console.error('Failed to log webhook:', error);
    }
  } catch (error) {
    console.error('Webhook logging error:', error);
  }
}

async function findOrCreateAffiliate(affiliateId: number, payload: AffiliateWPWebhookPayload): Promise<string | null> {
  try {
    // First, try to find existing affiliate
    const { data: existingAffiliate, error: findError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding affiliate:', findError);
      return null;
    }

    if (existingAffiliate) {
      return existingAffiliate.id;
    }

    // Create new affiliate if not found
    const { data: newAffiliate, error: createError } = await supabase
      .from('affiliates')
      .insert({
        affiliate_id: affiliateId,
        name: payload.customer_name || `Affiliate ${affiliateId}`,
        email: payload.customer_email || `affiliate${affiliateId}@example.com`,
        status: 'active'
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating affiliate:', createError);
      return null;
    }

    return newAffiliate.id;
  } catch (error) {
    console.error('Affiliate management error:', error);
    return null;
  }
}

async function processCommissionEntry(payload: AffiliateWPWebhookPayload): Promise<boolean> {
  try {
    const affiliateUuid = await findOrCreateAffiliate(payload.affiliate_id, payload);
    
    if (!affiliateUuid) {
      throw new Error('Failed to find or create affiliate');
    }

    // Check if commission entry already exists
    const { data: existingEntry, error: findError } = await supabase
      .from('commission_entries')
      .select('id')
      .eq('affiliatewp_referral_id', payload.referral_id)
      .maybeSingle();

    if (findError) {
      throw new Error(`Error checking existing commission: ${findError.message}`);
    }

    if (existingEntry) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('commission_entries')
        .update({
          commission_type: payload.commission_type,
          customer_name: payload.customer_name,
          customer_email: payload.customer_email,
          product_name: payload.product_name,
          product_id: payload.product_id,
          order_total: payload.order_total,
          commission_amount: payload.commission_amount,
          commission_rate: payload.commission_rate,
          status: payload.status,
          payment_date: payload.payment_date ? new Date(payload.payment_date).toISOString() : null,
          notes: payload.notes,
          webhook_data: payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id);

      if (updateError) {
        throw new Error(`Error updating commission entry: ${updateError.message}`);
      }

      console.log(`Updated commission entry for referral ${payload.referral_id}`);
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('commission_entries')
        .insert({
          affiliate_id: affiliateUuid,
          affiliatewp_referral_id: payload.referral_id,
          commission_type: payload.commission_type,
          customer_name: payload.customer_name,
          customer_email: payload.customer_email,
          product_name: payload.product_name,
          product_id: payload.product_id,
          order_total: payload.order_total,
          commission_amount: payload.commission_amount,
          commission_rate: payload.commission_rate,
          status: payload.status,
          payment_date: payload.payment_date ? new Date(payload.payment_date).toISOString() : null,
          notes: payload.notes,
          webhook_data: payload
        });

      if (insertError) {
        throw new Error(`Error creating commission entry: ${insertError.message}`);
      }

      console.log(`Created new commission entry for referral ${payload.referral_id}`);
    }

    // Try to link commission to user profile if AffiliateWP ID matches
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('affiliatewp_id', payload.affiliate_id)
        .maybeSingle();

      if (profileError) {
        console.log('No profile found for affiliate ID:', payload.affiliate_id);
      } else if (profile) {
        console.log(`Linked commission to profile ${profile.id} for affiliate ${payload.affiliate_id}`);
      }
    } catch (linkError) {
      console.log('Error linking commission to profile:', linkError);
    }

    return true;
  } catch (error) {
    console.error('Commission processing error:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get request body
    const body = await req.text()
    let payload: AffiliateWPWebhookPayload

    try {
      payload = JSON.parse(body)
    } catch (error) {
      await logWebhook({ raw_body: body }, false, 'Invalid JSON payload')
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log incoming webhook
    await logWebhook(payload, false)

    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-affiliatewp-signature')
    const webhookSecret = Deno.env.get('AFFILIATEWP_WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret)
      if (!isValid) {
        await logWebhook(payload, false, 'Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Validate required fields
    const requiredFields = [
      'referral_id', 'affiliate_id', 'customer_name', 'customer_email',
      'product_name', 'product_id', 'order_total', 'commission_amount', 'commission_rate'
    ]

    const missingFields = requiredFields.filter(field => !payload[field])
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`
      await logWebhook(payload, false, errorMessage)
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Process the commission entry
    try {
      await processCommissionEntry(payload)
      
      // Mark webhook as processed
      await logWebhook(payload, true)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Commission processed successfully',
          referral_id: payload.referral_id 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (processingError) {
      const errorMessage = processingError instanceof Error ? processingError.message : 'Processing failed'
      await logWebhook(payload, false, errorMessage)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process commission', 
          details: errorMessage 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Webhook handler error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})