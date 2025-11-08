import { supabase } from './supabaseClient';
import { commissionService } from './commissionService';

export interface Lead {
  id: string;
  company_id: string;
  assigned_rep_id?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  score: number;
  estimated_value?: number;
  roof_type?: string;
  notes?: string;
  source: string;
  lead_source_id?: string;
  last_contact_date?: string;
  next_follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  company_id: string;
  lead_id?: string;
  assigned_rep_id: string;
  stage_id: string;
  title: string;
  description?: string;
  value: number;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  lost_reason?: string;
  created_at: string;
  updated_at: string;
  stage?: {
    id: string;
    name: string;
    order_index: number;
    probability_percentage: number;
  };
  lead?: {
    name: string;
    phone: string;
  };
}

export interface DealStage {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  order_index: number;
  probability_percentage: number;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  company_id: string;
  lead_id?: string;
  deal_id?: string;
  assigned_rep_id: string;
  appointment_type_id?: string;
  title: string;
  description?: string;
  location?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminder_sent_at?: string;
  outcome?: string;
  next_action?: string;
  created_at: string;
  updated_at: string;
  lead?: {
    name: string;
    phone: string;
  };
  appointment_type?: {
    name: string;
    color: string;
  };
}

export interface Prospect {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone: string;
  status: 'lead' | 'qualified' | 'proposal_sent' | 'negotiating' | 'closed_won' | 'closed_lost';
  deal_value: number;
  probability: number;
  source: string;
  assigned_rep_id?: string;
  company_size?: string;
  current_crm?: string;
  pain_points?: string[];
  decision_maker: boolean;
  notes?: string;
  last_contact_date: string;
  next_follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  company_id: string;
  deal_id: string;
  rep_id: string;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  quarter: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deal?: {
    title: string;
    value: number;
  };
  rep?: {
    id: string;
    company_name: string;
  };
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  subject?: string;
  description?: string;
  duration_minutes?: number;
  outcome?: string;
  next_action?: string;
  scheduled_at?: string;
  created_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description?: string;
  previous_stage_id?: string;
  new_stage_id?: string;
  previous_value?: number;
  new_value?: number;
  created_at: string;
}

export interface AnalyticsData {
  totalLeads: number;
  totalDeals: number;
  totalAppointments: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  avgDealSize: number;
  pipelineValue: number;
  appointmentCompletionRate: number;
  totalCalls: number;
  totalSMS: number;
  smsResponseRate: number;
  callSuccessRate: number;
  leadsBySource: Array<{ source: string; count: number }>;
  dealsByStage: Array<{ stage: string; count: number; value: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; deals: number }>;
  conversionFunnel: Array<{ stage: string; count: number; percentage: number }>;
  recentActivities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    success: boolean;
    user_id?: string;
  }>;
  upcomingTasks: Array<{
    id: string;
    task: string;
    priority: 'high' | 'medium' | 'low';
    due: string;
    type: string;
  }>;
}

export interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  full_name?: string;
  company_phone?: string;
  personal_phone?: string;
  company_email?: string;
  company_address?: string;
  personal_address?: string;
  subscription_plan: string;
  user_role: string;
  territory?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_type?: string;
  affiliatewp_id?: number;
  affiliatewp_earnings?: number;
  affiliatewp_unpaid_earnings?: number;
  affiliatewp_referrals?: number;
  affiliatewp_visits?: number;
  last_metrics_sync?: string;
}

export const supabaseService = {
  // LEAD MANAGEMENT
  async getLeads(companyId: string, limit?: number): Promise<Lead[]> {
    try {
      // Get current user's profile to determine role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[getLeads] No authenticated user');
        return [];
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_role, id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[getLeads] Error fetching profile:', profileError);
        return [];
      }

      console.log('[getLeads] User profile:', {
        userId: user.id,
        profileId: profile.id,
        role: profile.user_role,
        companyId,
        limit: limit || 'unlimited'
      });

      // If limit is specified, fetch only that many records (for faster initial load)
      if (limit) {
        let query = supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (profile?.user_role === 'sales_rep') {
          query = query.eq('assigned_rep_id', companyId);
        } else {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[getLeads] Query error:', error);
          throw error;
        }

        console.log('[getLeads] Fetched leads count:', data?.length || 0);
        return data || [];
      }

      // Fetch all leads using pagination to bypass 1000 row limit
      let allLeads: Lead[] = [];
      let start = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('leads')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(start, start + pageSize - 1);

        // If sales rep, only show their assigned leads
        // If manager/admin, show all company leads
        if (profile?.user_role === 'sales_rep') {
          query = query.eq('assigned_rep_id', companyId);
        } else {
          query = query.eq('company_id', companyId);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('[getLeads] Query error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allLeads = [...allLeads, ...data];
          start += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log('[getLeads] Fetched leads count:', allLeads.length);
      return allLeads;
    } catch (error) {
      console.error('[getLeads] Error fetching leads:', error);
      return [];
    }
  },

  async createLead(companyId: string, leadData: Partial<Lead>): Promise<Lead> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          company_id: companyId,
          assigned_rep_id: companyId,
          name: leadData.name || '',
          email: leadData.email,
          phone: leadData.phone || '',
          address: leadData.address,
          status: leadData.status || 'new',
          score: leadData.score || Math.floor(Math.random() * 40) + 60,
          estimated_value: leadData.estimated_value,
          roof_type: leadData.roof_type,
          notes: leadData.notes,
          source: leadData.source || 'website',
        })
        .select()
        .single();

      if (error) throw error;

      // Log lead creation activity
      await this.logLeadActivity(data.id, companyId, 'lead_created', {
        subject: 'Lead Created',
        description: `New lead ${data.name} added from ${data.source}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  async bulkCreateLeads(companyId: string, leadsData: Partial<Lead>[]): Promise<{
    success: Lead[];
    failed: Array<{ data: Partial<Lead>; error: string }>;
    duplicates: Array<{ data: Partial<Lead>; existingLead: Lead }>;
  }> {
    try {
      const success: Lead[] = [];
      const failed: Array<{ data: Partial<Lead>; error: string }> = [];
      const duplicates: Array<{ data: Partial<Lead>; existingLead: Lead }> = [];

      // Check for duplicates in the database
      const phoneNumbers = leadsData
        .map(lead => lead.phone)
        .filter(phone => phone && phone.trim());

      const { data: existingLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .in('phone', phoneNumbers);

      const existingPhoneMap = new Map(
        (existingLeads || []).map(lead => [this.normalizePhone(lead.phone), lead])
      );

      // Process leads in chunks of 50 for better performance
      const chunkSize = 50;
      for (let i = 0; i < leadsData.length; i += chunkSize) {
        const chunk = leadsData.slice(i, i + chunkSize);
        const validLeads: any[] = [];

        for (const leadData of chunk) {
          // Check for duplicates
          const normalizedPhone = this.normalizePhone(leadData.phone || '');
          if (existingPhoneMap.has(normalizedPhone)) {
            duplicates.push({
              data: leadData,
              existingLead: existingPhoneMap.get(normalizedPhone)!
            });
            continue;
          }

          // Validate required fields
          if (!leadData.name || !leadData.phone) {
            failed.push({
              data: leadData,
              error: 'Missing required fields: name or phone'
            });
            continue;
          }

          // Prepare lead for insertion
          validLeads.push({
            company_id: companyId,
            assigned_rep_id: companyId,
            name: leadData.name,
            email: leadData.email || null,
            phone: leadData.phone,
            address: leadData.address || null,
            status: leadData.status || 'new',
            score: leadData.score || Math.floor(Math.random() * 40) + 60,
            estimated_value: leadData.estimated_value || null,
            roof_type: leadData.roof_type || null,
            notes: leadData.notes || null,
            source: leadData.source || 'import',
          });
        }

        // Bulk insert valid leads
        if (validLeads.length > 0) {
          const { data: insertedLeads, error } = await supabase
            .from('leads')
            .insert(validLeads)
            .select();

          if (error) {
            // If bulk insert fails, try one by one
            for (const leadData of validLeads) {
              try {
                const { data: singleLead, error: singleError } = await supabase
                  .from('leads')
                  .insert(leadData)
                  .select()
                  .single();

                if (singleError) throw singleError;
                success.push(singleLead);

                // Log activity for individual lead
                await this.logLeadActivity(singleLead.id, companyId, 'lead_created', {
                  subject: 'Lead Imported',
                  description: `Lead ${singleLead.name} imported from CSV`,
                });
              } catch (singleErr: any) {
                failed.push({
                  data: leadData,
                  error: singleErr.message || 'Failed to insert lead'
                });
              }
            }
          } else {
            success.push(...(insertedLeads || []));

            // Log activities for all inserted leads
            for (const lead of insertedLeads || []) {
              await this.logLeadActivity(lead.id, companyId, 'lead_created', {
                subject: 'Lead Imported',
                description: `Lead ${lead.name} imported from CSV`,
              });
            }
          }
        }
      }

      return { success, failed, duplicates };
    } catch (error) {
      console.error('Error in bulk create leads:', error);
      throw error;
    }
  },

  normalizePhone(phone: string): string {
    // Remove all non-digit characters for comparison
    return phone.replace(/\D/g, '');
  },

  async updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      console.log('updateLead called with:', { leadId, updates });

      const { data: currentUser } = await supabase.auth.getUser();
      console.log('Current auth user:', currentUser?.user?.id);

      // Method 1: Try using the database function that bypasses RLS
      if (updates.status && Object.keys(updates).length === 1) {
        console.log('Using update_lead_status RPC function for status-only update');
        const { data, error } = await supabase.rpc('update_lead_status', {
          lead_id: leadId,
          new_status: updates.status
        });

        if (!error && data) {
          console.log('Lead status updated successfully via RPC:', data);

          try {
            await this.logLeadActivity(leadId, data.company_id, 'status_change', {
              subject: 'Status Updated',
              description: `Lead status changed to ${updates.status}`,
            });
          } catch (activityError) {
            console.warn('Failed to log activity, but update succeeded:', activityError);
          }

          return data;
        }

        console.warn('RPC status update failed, trying direct update:', error);
      }

      // Method 2: Try direct update with the new permissive RLS policy
      console.log('Attempting direct update via Supabase client');
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      console.log('Supabase direct update response:', { data, error });

      if (error) {
        console.error('Direct update failed, trying general RPC:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // Method 3: Try using the general update function as last resort
        console.log('Trying general update_lead RPC function');
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_lead', {
          lead_id: leadId,
          updates: updates as any
        });

        if (rpcError) {
          console.error('All update methods failed:', rpcError);
          throw rpcError;
        }

        if (!rpcData) {
          throw new Error('No data returned from any update method');
        }

        console.log('Lead updated successfully via general RPC:', rpcData);

        if (updates.status) {
          try {
            await this.logLeadActivity(leadId, rpcData.company_id, 'status_change', {
              subject: 'Status Updated',
              description: `Lead status changed to ${updates.status}`,
            });
          } catch (activityError) {
            console.warn('Failed to log activity, but update succeeded:', activityError);
          }
        }

        return rpcData;
      }

      if (!data) {
        throw new Error('No data returned from update operation');
      }

      console.log('Lead updated successfully via direct method:', data);

      if (updates.status) {
        try {
          await this.logLeadActivity(leadId, data.company_id, 'status_change', {
            subject: 'Status Updated',
            description: `Lead status changed to ${updates.status}`,
          });
        } catch (activityError) {
          console.warn('Failed to log activity, but update succeeded:', activityError);
        }
      }

      return data;
    } catch (error: any) {
      console.error('Error updating lead - ALL METHODS FAILED:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      throw error;
    }
  },

  async deleteLead(leadId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  },

  // LEAD ACTIVITY TRACKING
  async logLeadActivity(
    leadId: string, 
    userId: string, 
    activityType: string, 
    details: {
      subject?: string;
      description?: string;
      duration_minutes?: number;
      outcome?: string;
      next_action?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          user_id: userId,
          activity_type: activityType,
          subject: details.subject,
          description: details.description,
          duration_minutes: details.duration_minutes,
          outcome: details.outcome,
          next_action: details.next_action,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging lead activity:', error);
    }
  },

  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching lead activities:', error);
      return [];
    }
  },

  // DEAL MANAGEMENT
  async getDeals(companyId: string): Promise<Deal[]> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          stage:deal_stages(*),
          lead:leads(name, phone)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
  },

  async createDeal(companyId: string, dealData: Partial<Deal>): Promise<Deal> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .insert({
          company_id: companyId,
          assigned_rep_id: companyId,
          ...dealData,
        })
        .select(`
          *,
          stage:deal_stages(*),
          lead:leads(name, phone)
        `)
        .single();

      if (error) throw error;

      // Log deal creation activity
      await this.logDealActivity(data.id, companyId, 'deal_created', {
        description: `Deal "${data.title}" created with value $${data.value}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  },

  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal> {
    try {
      // Get current deal for comparison
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      const { data, error } = await supabase
        .from('deals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId)
        .select(`
          *,
          stage:deal_stages(*),
          lead:leads(name, phone)
        `)
        .single();

      if (error) throw error;

      // Log stage change activity if stage was updated
      if (updates.stage_id && currentDeal && updates.stage_id !== currentDeal.stage_id) {
        await this.logDealActivity(dealId, data.company_id, 'stage_change', {
          description: `Deal stage changed`,
          previous_stage_id: currentDeal.stage_id,
          new_stage_id: updates.stage_id,
        });
      }

      // Log value change activity if value was updated
      if (updates.value && currentDeal && updates.value !== currentDeal.value) {
        await this.logDealActivity(dealId, data.company_id, 'value_change', {
          description: `Deal value updated from $${currentDeal.value} to $${updates.value}`,
          previous_value: currentDeal.value,
          new_value: updates.value,
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  },

  async deleteDeal(dealId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  },

  async getDealStages(companyId: string): Promise<DealStage[]> {
    try {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching deal stages:', error);
      return [];
    }
  },

  // DEAL ACTIVITY TRACKING
  async logDealActivity(
    dealId: string,
    userId: string,
    activityType: string,
    details: {
      description?: string;
      previous_stage_id?: string;
      new_stage_id?: string;
      previous_value?: number;
      new_value?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('deal_activities')
        .insert({
          deal_id: dealId,
          user_id: userId,
          activity_type: activityType,
          description: details.description,
          previous_stage_id: details.previous_stage_id,
          new_stage_id: details.new_stage_id,
          previous_value: details.previous_value,
          new_value: details.new_value,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging deal activity:', error);
    }
  },

  async getDealActivities(dealId: string): Promise<DealActivity[]> {
    try {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching deal activities:', error);
      return [];
    }
  },

  // APPOINTMENT MANAGEMENT
  async getAppointments(companyId: string): Promise<Appointment[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          lead:leads(name, phone)
        `)
        .eq('company_id', companyId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  },

  async createAppointment(companyId: string, appointmentData: Partial<Appointment>): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          company_id: companyId,
          assigned_rep_id: companyId,
          ...appointmentData,
        })
        .select(`
          *,
          lead:leads(name, phone)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  },

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select(`
          *,
          lead:leads(name, phone)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  // COMMISSION MANAGEMENT
  async getCommissions(companyId: string): Promise<Commission[]> {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          deal:deals(title, value),
          rep:profiles!commissions_rep_id_fkey(id, company_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching commissions:', error);
      return [];
    }
  },

  async createCommission(commissionData: Partial<Commission>): Promise<Commission> {
    try {
      const { data, error } = await supabase
        .from('commissions')
        .insert(commissionData)
        .select(`
          *,
          deal:deals(title, value),
          rep:profiles!commissions_rep_id_fkey(id, company_name)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating commission:', error);
      throw error;
    }
  },

  async updateCommissionStatus(commissionId: string, status: Commission['status']): Promise<Commission> {
    try {
      const updates: any = { status };

      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      } else if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('commissions')
        .update(updates)
        .eq('id', commissionId)
        .select(`
          *,
          deal:deals(title, value),
          rep:profiles!commissions_rep_id_fkey(id, company_name)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating commission status:', error);
      throw error;
    }
  },

  // PROSPECT MANAGEMENT
  async getProspectsCount(companyId: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return 0;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_role, id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        return 0;
      }

      let query = supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true });

      if (profile?.user_role === 'sales_rep') {
        query = query.eq('assigned_rep_id', companyId);
      } else {
        query = query.eq('company_id', companyId);
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('[getProspectsCount] Error:', error);
      return 0;
    }
  },

  async getProspects(companyId: string, limit?: number, offset?: number): Promise<Prospect[]> {
    try {
      // Get current user's profile to determine role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[getProspects] No authenticated user');
        return [];
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_role, id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[getProspects] Error fetching profile:', profileError);
        return [];
      }

      console.log('[getProspects] User profile:', {
        userId: user.id,
        profileId: profile.id,
        role: profile.user_role,
        companyId,
        limit: limit || 'unlimited',
        offset: offset || 0
      });

      // If limit is specified, fetch only that many records (for faster initial load)
      if (limit !== undefined) {
        const start = offset || 0;
        const end = start + limit - 1;

        let query = supabase
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false })
          .range(start, end);

        if (profile?.user_role === 'sales_rep') {
          query = query.eq('assigned_rep_id', companyId);
        } else {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[getProspects] Query error:', error);
          throw error;
        }

        console.log('[getProspects] Fetched prospects count:', data?.length || 0, 'offset:', start);
        return data || [];
      }

      // Fetch all prospects using pagination to bypass 1000 row limit
      let allProspects: Prospect[] = [];
      let start = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('prospects')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(start, start + pageSize - 1);

        // If sales rep, only show their assigned prospects
        // If manager/admin, show all company prospects
        if (profile?.user_role === 'sales_rep') {
          query = query.eq('assigned_rep_id', companyId);
        } else {
          query = query.eq('company_id', companyId);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('[getProspects] Query error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allProspects = [...allProspects, ...data];
          start += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log('[getProspects] Fetched prospects count:', allProspects.length);
      return allProspects;
    } catch (error) {
      console.error('[getProspects] Error fetching prospects:', error);
      return [];
    }
  },

  async createProspect(companyId: string, prospectData: Partial<Prospect>): Promise<Prospect> {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .insert({
          company_id: companyId,
          assigned_rep_id: companyId,
          company_name: prospectData.company_name || '',
          contact_name: prospectData.contact_name || '',
          email: prospectData.email,
          phone: prospectData.phone || '',
          status: prospectData.status || 'lead',
          deal_value: prospectData.deal_value || 199,
          probability: prospectData.probability || 50,
          source: prospectData.source || 'website',
          company_size: prospectData.company_size,
          current_crm: prospectData.current_crm,
          pain_points: prospectData.pain_points,
          decision_maker: prospectData.decision_maker || false,
          notes: prospectData.notes,
          next_follow_up_date: prospectData.next_follow_up_date,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating prospect:', error);
      throw error;
    }
  },

  async updateProspect(prospectId: string, updates: Partial<Prospect>): Promise<Prospect> {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating prospect:', error);
      throw error;
    }
  },

  async deleteProspect(prospectId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting prospect:', error);
      throw error;
    }
  },

  async bulkCreateProspects(companyId: string, prospectsData: Partial<Prospect>[]): Promise<{
    success: Prospect[];
    failed: Array<{ data: Partial<Prospect>; error: string }>;
    duplicates: Array<{ data: Partial<Prospect>; existingProspect: Prospect }>;
  }> {
    try {
      const success: Prospect[] = [];
      const failed: Array<{ data: Partial<Prospect>; error: string }> = [];
      const duplicates: Array<{ data: Partial<Prospect>; existingProspect: Prospect }> = [];

      const phoneNumbers = prospectsData
        .map(prospect => prospect.phone)
        .filter(phone => phone && phone.trim());

      const { data: existingProspects } = await supabase
        .from('prospects')
        .select('*')
        .eq('company_id', companyId)
        .in('phone', phoneNumbers);

      const existingPhoneMap = new Map(
        (existingProspects || []).map(prospect => [this.normalizePhone(prospect.phone), prospect])
      );

      const chunkSize = 50;
      for (let i = 0; i < prospectsData.length; i += chunkSize) {
        const chunk = prospectsData.slice(i, i + chunkSize);
        const validProspects: any[] = [];

        for (const prospectData of chunk) {
          const normalizedPhone = this.normalizePhone(prospectData.phone || '');
          if (existingPhoneMap.has(normalizedPhone)) {
            duplicates.push({
              data: prospectData,
              existingProspect: existingPhoneMap.get(normalizedPhone)!
            });
            continue;
          }

          if (!prospectData.company_name || !prospectData.contact_name || !prospectData.phone) {
            failed.push({
              data: prospectData,
              error: 'Missing required fields: company_name, contact_name, or phone'
            });
            continue;
          }

          validProspects.push({
            company_id: companyId,
            assigned_rep_id: companyId,
            company_name: prospectData.company_name,
            contact_name: prospectData.contact_name,
            email: prospectData.email || null,
            phone: prospectData.phone,
            status: prospectData.status || 'lead',
            deal_value: prospectData.deal_value || 199,
            probability: prospectData.probability || 50,
            source: prospectData.source || 'import',
            company_size: prospectData.company_size || null,
            current_crm: prospectData.current_crm || null,
            pain_points: prospectData.pain_points || null,
            decision_maker: prospectData.decision_maker || false,
            notes: prospectData.notes || null,
            next_follow_up_date: prospectData.next_follow_up_date || null,
            last_contact_date: new Date().toISOString(),
          });
        }

        if (validProspects.length > 0) {
          const { data: insertedProspects, error } = await supabase
            .from('prospects')
            .insert(validProspects)
            .select();

          if (error) {
            for (const prospectData of validProspects) {
              try {
                const { data: singleProspect, error: singleError } = await supabase
                  .from('prospects')
                  .insert(prospectData)
                  .select()
                  .single();

                if (singleError) throw singleError;
                success.push(singleProspect);
              } catch (singleErr: any) {
                failed.push({
                  data: prospectData,
                  error: singleErr.message || 'Failed to insert prospect'
                });
              }
            }
          } else {
            success.push(...(insertedProspects || []));
          }
        }
      }

      return { success, failed, duplicates };
    } catch (error) {
      console.error('Error in bulk create prospects:', error);
      throw error;
    }
  },

  // COMPREHENSIVE ANALYTICS
  async getAnalyticsData(companyId: string, timeRange: string = '30d'): Promise<AnalyticsData> {
    try {
      // Calculate date range
      const now = new Date();
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Fetch core data first (most important)
      const [leads, deals, prospects] = await Promise.all([
        this.getLeads(companyId),
        this.getDeals(companyId),
        this.getProspects(companyId)
      ]);

      // Fetch secondary data (can be loaded later if needed)
      const [appointments, commissions] = await Promise.all([
        this.getAppointments(companyId),
        this.getCommissions(companyId)
      ]);

      // Load activities in background (least critical)
      const [leadActivities, dealActivities] = await Promise.all([
        this.getRecentLeadActivities(companyId, 20), // Reduced from 50
        this.getRecentDealActivities(companyId, 20)  // Reduced from 50
      ]);

      // Load affiliate commissions only if user has affiliate ID
      let affiliateCommissions: any[] = [];
      try {
        const allAffiliateCommissions = await commissionService.getCommissionEntries();
        affiliateCommissions = allAffiliateCommissions;
      } catch (error) {
        console.log('Could not load affiliate commissions:', error);
        affiliateCommissions = [];
      }

      // Filter data by time range
      const filteredLeads = leads.filter(l => new Date(l.created_at) >= startDate);
      const filteredDeals = deals.filter(d => new Date(d.created_at) >= startDate);
      const filteredAppointments = appointments.filter(a => new Date(a.created_at) >= startDate);
      const filteredAffiliateCommissions = affiliateCommissions.filter(c => new Date(c.created_at) >= startDate);

      // Calculate metrics - prioritize AffiliateWP data
      const affiliateRevenue = filteredAffiliateCommissions
        .filter(commission => commission.status === 'paid' || commission.status === 'approved')
        .reduce((sum, commission) => sum + commission.order_total, 0);

      const legacyRevenue = deals
        .filter(deal => deal.status === 'won')
        .reduce((sum, deal) => sum + deal.value, 0);

      const combinedRevenue = affiliateRevenue + legacyRevenue;

      const wonDeals = deals.filter(d => d.status === 'won');
      const conversionRate = leads.length > 0
        ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100)
        : 0;

      const avgDealSize = wonDeals.length > 0
        ? Math.round(wonDeals.reduce((sum, deal) => sum + deal.value, 0) / wonDeals.length)
        : 0;

      const pipelineValue = deals
        .filter(deal => deal.status === 'open')
        .reduce((sum, deal) => sum + deal.value, 0);

      const appointmentCompletionRate = appointments.length > 0
        ? Math.round((appointments.filter(a => a.status === 'completed').length / appointments.length) * 100)
        : 0;

      // Calculate total commissions from AffiliateWP (primary source)
      const totalCommissions = affiliateCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

      // Lead sources analysis
      const leadsBySource = this.calculateLeadsBySource(filteredLeads);

      // Deals by stage analysis
      const dealsByStage = this.calculateDealsByStage(deals);

      // Revenue by month
      const revenueByMonth = this.calculateRevenueByMonth(wonDeals, filteredAffiliateCommissions, daysBack);

      // Conversion funnel
      const conversionFunnel = this.calculateConversionFunnel(leads);

      // Recent activities
      const recentActivities = this.formatRecentActivities(leadActivities.slice(0, 10), dealActivities.slice(0, 10));

      // Upcoming tasks
      const upcomingTasks = this.generateUpcomingTasks(appointments.slice(0, 10), leads.slice(0, 10), deals.slice(0, 10));

      return {
        totalLeads: leads.length,
        totalDeals: deals.length,
        totalAppointments: appointments.length,
        totalRevenue: combinedRevenue,
        totalCommissions,
        conversionRate,
        avgDealSize,
        pipelineValue,
        appointmentCompletionRate,
        totalCalls: leadActivities.filter(a => a.activity_type === 'call').length,
        totalSMS: leadActivities.filter(a => a.activity_type === 'sms').length,
        smsResponseRate: this.calculateSMSResponseRate(leadActivities),
        callSuccessRate: this.calculateCallSuccessRate(leadActivities),
        leadsBySource,
        dealsByStage,
        revenueByMonth,
        conversionFunnel,
        recentActivities,
        upcomingTasks,
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      // Return empty analytics structure
      return {
        totalLeads: 0,
        totalDeals: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        totalCommissions: 0,
        conversionRate: 0,
        avgDealSize: 0,
        pipelineValue: 0,
        appointmentCompletionRate: 0,
        totalCalls: 0,
        totalSMS: 0,
        smsResponseRate: 0,
        callSuccessRate: 0,
        leadsBySource: [],
        dealsByStage: [],
        revenueByMonth: [],
        conversionFunnel: [],
        recentActivities: [],
        upcomingTasks: [],
      };
    }
  },

  // ANALYTICS HELPER METHODS
  calculateLeadsBySource(leads: Lead[]): Array<{ source: string; count: number }> {
    const sourceMap = new Map<string, number>();
    leads.forEach(lead => {
      const count = sourceMap.get(lead.source) || 0;
      sourceMap.set(lead.source, count + 1);
    });

    return Array.from(sourceMap.entries()).map(([source, count]) => ({
      source: source.replace('_', ' '),
      count
    }));
  },

  calculateDealsByStage(deals: Deal[]): Array<{ stage: string; count: number; value: number }> {
    const stageMap = new Map<string, { count: number; value: number }>();
    
    deals.forEach(deal => {
      const stageName = deal.stage?.name || 'Unknown';
      const current = stageMap.get(stageName) || { count: 0, value: 0 };
      stageMap.set(stageName, {
        count: current.count + 1,
        value: current.value + deal.value
      });
    });

    return Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value
    }));
  },

  calculateRevenueByMonth(wonDeals: Deal[], affiliateCommissions: any[], daysBack: number): Array<{ month: string; revenue: number; deals: number }> {
    const monthMap = new Map<string, { revenue: number; deals: number }>();
    
    wonDeals.forEach(deal => {
      const date = new Date(deal.actual_close_date || deal.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const current = monthMap.get(monthKey) || { revenue: 0, deals: 0 };
      monthMap.set(monthKey, {
        revenue: current.revenue + deal.value,
        deals: current.deals + 1
      });
    });

    // Add affiliate commission revenue (primary revenue source)
    affiliateCommissions.forEach(commission => {
      if (commission.status === 'paid' || commission.status === 'approved') {
        const date = new Date(commission.payment_date || commission.created_at);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const current = monthMap.get(monthKey) || { revenue: 0, deals: 0 };
        monthMap.set(monthKey, {
          revenue: current.revenue + commission.order_total,
          deals: current.deals + 1
        });
      }
    });

    // Generate last 4 months of data
    const result = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const data = monthMap.get(monthKey) || { revenue: 0, deals: 0 };
      result.push({
        month: monthKey,
        revenue: data.revenue,
        deals: data.deals
      });
    }

    return result;
  },

  calculateConversionFunnel(leads: Lead[]): Array<{ stage: string; count: number; percentage: number }> {
    const stages = [
      { stage: 'New Leads', status: ['new', 'contacted', 'qualified', 'won', 'lost'] },
      { stage: 'Contacted', status: ['contacted', 'qualified', 'won', 'lost'] },
      { stage: 'Qualified', status: ['qualified', 'won', 'lost'] },
      { stage: 'Won', status: ['won'] }
    ];

    const totalLeads = leads.length;

    return stages.map(stage => {
      const count = leads.filter(lead => stage.status.includes(lead.status)).length;
      const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
      return {
        stage: stage.stage,
        count,
        percentage
      };
    });
  },

  calculateSMSResponseRate(activities: LeadActivity[]): number {
    const smsActivities = activities.filter(a => a.activity_type === 'sms');
    const responses = smsActivities.filter(a => a.outcome === 'response');
    return smsActivities.length > 0 ? Math.round((responses.length / smsActivities.length) * 100) : 0;
  },

  calculateCallSuccessRate(activities: LeadActivity[]): number {
    const callActivities = activities.filter(a => a.activity_type === 'call');
    const successfulCalls = callActivities.filter(a => a.outcome === 'success');
    return callActivities.length > 0 ? Math.round((successfulCalls.length / callActivities.length) * 100) : 0;
  },

  formatRecentActivities(leadActivities: LeadActivity[], dealActivities: DealActivity[]): Array<{
    id: string;
    type: string;
    message: string;
    time: string;
    success: boolean;
    user_id?: string;
  }> {
    const allActivities = [
      ...leadActivities.map(a => ({
        id: a.id,
        type: a.activity_type,
        message: a.description || a.subject || `${a.activity_type} activity`,
        time: this.formatTimeAgo(a.created_at),
        success: a.outcome === 'success' || a.outcome === 'positive',
        user_id: a.user_id,
        created_at: a.created_at
      })),
      ...dealActivities.map(a => ({
        id: a.id,
        type: a.activity_type,
        message: a.description || `${a.activity_type} activity`,
        time: this.formatTimeAgo(a.created_at),
        success: true,
        user_id: a.user_id,
        created_at: a.created_at
      }))
    ];

    return allActivities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  },

  generateUpcomingTasks(appointments: Appointment[], leads: Lead[], deals: Deal[]): Array<{
    id: string;
    task: string;
    priority: 'high' | 'medium' | 'low';
    due: string;
    type: string;
  }> {
    const tasks = [];

    // Upcoming appointments
    const upcomingAppointments = appointments
      .filter(a => new Date(a.scheduled_at) > new Date() && a.status === 'scheduled')
      .slice(0, 3);

    upcomingAppointments.forEach(apt => {
      tasks.push({
        id: apt.id,
        task: `${apt.title} - ${apt.lead?.name || 'No contact'}`,
        priority: 'high' as const,
        due: this.formatTimeUntil(apt.scheduled_at),
        type: 'appointment'
      });
    });

    // Follow-up tasks for leads
    const followUpLeads = leads
      .filter(l => l.next_follow_up_date && new Date(l.next_follow_up_date) > new Date())
      .slice(0, 3);

    followUpLeads.forEach(lead => {
      tasks.push({
        id: lead.id,
        task: `Follow up with ${lead.name}`,
        priority: lead.status === 'new' ? 'high' as const : 'medium' as const,
        due: this.formatTimeUntil(lead.next_follow_up_date!),
        type: 'follow_up'
      });
    });

    // Overdue deals
    const overdueDeals = deals
      .filter(d => d.expected_close_date && new Date(d.expected_close_date) < new Date() && d.status === 'open')
      .slice(0, 2);

    overdueDeals.forEach(deal => {
      tasks.push({
        id: deal.id,
        task: `Review overdue deal: ${deal.title}`,
        priority: 'high' as const,
        due: 'Overdue',
        type: 'deal_review'
      });
    });

    return tasks.slice(0, 8); // Limit to 8 tasks
  },

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  },

  formatTimeUntil(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));

    if (diffInMinutes < 0) return 'Overdue';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours`;
    return `${Math.floor(diffInMinutes / 1440)} days`;
  },

  // ACTIVITY FETCHING
  async getRecentLeadActivities(companyId: string, limit: number = 20): Promise<LeadActivity[]> {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          lead:leads!inner(company_id)
        `)
        .eq('lead.company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent lead activities:', error);
      return [];
    }
  },

  async getRecentDealActivities(companyId: string, limit: number = 20): Promise<DealActivity[]> {
    try {
      const { data, error } = await supabase
        .from('deal_activities')
        .select(`
          *,
          deal:deals!inner(company_id)
        `)
        .eq('deal.company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent deal activities:', error);
      return [];
    }
  },

  // CHART DATA GENERATION
  async getChartData(companyId: string, timeRange: string = '30d'): Promise<{
    dailyActivity: Array<{ date: string; leads: number; calls: number; revenue: number; appointments: number }>;
    leadSources: Array<{ name: string; value: number }>;
    callOutcomes: Array<{ outcome: string; count: number }>;
  }> {
    try {
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const [leads, deals, activities] = await Promise.all([
        this.getLeads(companyId),
        this.getDeals(companyId),
        this.getRecentLeadActivities(companyId, 1000)
      ]);

      // Generate daily activity data
      const dailyActivity = [];
      for (let i = daysBack - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayLeads = leads.filter(l => l.created_at.startsWith(dateStr)).length;
        const dayCalls = activities.filter(a => 
          a.activity_type === 'call' && a.created_at.startsWith(dateStr)
        ).length;
        const dayRevenue = deals.filter(d => 
          d.status === 'won' && d.actual_close_date?.startsWith(dateStr)
        ).reduce((sum, d) => sum + d.value, 0);
        const dayAppointments = activities.filter(a => 
          a.activity_type === 'appointment' && a.created_at.startsWith(dateStr)
        ).length;

        dailyActivity.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          leads: dayLeads,
          calls: dayCalls,
          revenue: dayRevenue,
          appointments: dayAppointments
        });
      }

      // Lead sources
      const leadSources = this.calculateLeadsBySource(leads).map(item => ({
        name: item.source,
        value: item.count
      }));

      // Call outcomes
      const callActivities = activities.filter(a => a.activity_type === 'call');
      const outcomeMap = new Map<string, number>();
      callActivities.forEach(activity => {
        const outcome = activity.outcome || 'unknown';
        outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
      });

      const callOutcomes = Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
        outcome: outcome.toUpperCase(),
        count
      }));

      return {
        dailyActivity,
        leadSources,
        callOutcomes
      };
    } catch (error) {
      console.error('Error generating chart data:', error);
      return {
        dailyActivity: [],
        leadSources: [],
        callOutcomes: []
      };
    }
  },

  // PROFILE MANAGEMENT
  async getProfilesByCompany(companyId: string): Promise<Profile[]> {
    try {
      // Get all team members for this company
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('profile_id')
        .eq('company_id', companyId);

      if (teamError) throw teamError;

      if (!teamMembers || teamMembers.length === 0) {
        return [];
      }

      // Get all profiles for these team members
      const profileIds = teamMembers.map(tm => tm.profile_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      return profiles || [];
    } catch (error) {
      console.error('Error fetching profiles by company:', error);
      return [];
    }
  },

  async getSalesRepsCount(companyId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('sales_reps')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', companyId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting sales reps:', error);
      return 0;
    }
  },

  // MOCK DATA FALLBACK (for development/demo)
  getMockLeads(): Lead[] {
    return [
      {
        id: 'mock-1',
        company_id: 'mock-company',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Springfield, IL',
        status: 'new',
        score: 85,
        estimated_value: 15000,
        roof_type: 'Asphalt Shingles',
        notes: 'Interested in roof replacement due to storm damage',
        source: 'website',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-2',
        company_id: 'mock-company',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '(555) 987-6543',
        address: '456 Oak Ave, Springfield, IL',
        status: 'qualified',
        score: 92,
        estimated_value: 22000,
        roof_type: 'Metal Roofing',
        notes: 'High-quality lead from existing customer referral',
        source: 'referral',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  },

  // SAMPLE DATA CREATION (for new users)
  async createSampleData(companyId: string): Promise<void> {
    try {
      // Create sample leads
      const sampleLeads = [
        {
          name: 'John Smith',
          phone: '(555) 123-4567',
          email: 'john@example.com',
          address: '123 Main St, Springfield, IL',
          status: 'new' as const,
          estimated_value: 15000,
          roof_type: 'Asphalt Shingles',
          source: 'website',
          notes: 'Interested in roof replacement due to storm damage'
        },
        {
          name: 'Sarah Johnson',
          phone: '(555) 987-6543',
          email: 'sarah@example.com',
          address: '456 Oak Ave, Springfield, IL',
          status: 'qualified' as const,
          estimated_value: 22000,
          roof_type: 'Metal Roofing',
          source: 'referral',
          notes: 'High-quality lead from existing customer referral'
        }
      ];

      for (const leadData of sampleLeads) {
        await this.createLead(companyId, leadData);
      }

      console.log('Sample data created successfully');
    } catch (error) {
      console.error('Error creating sample data:', error);
    }
  },

  // AFFILIATE INTEGRATION HELPERS
  async linkAffiliateToProfile(profileId: string, affiliateWpId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ affiliatewp_id: affiliateWpId })
        .eq('id', profileId);

      if (error) throw error;
    } catch (error) {
      console.error('Error linking affiliate to profile:', error);
      throw error;
    }
  },

  async getProfileByAffiliateId(affiliateWpId: number): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('affiliatewp_id', affiliateWpId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding profile by affiliate ID:', error);
      return null;
    }
  }
};