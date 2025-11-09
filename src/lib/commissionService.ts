import { supabase } from './supabaseClient';

export interface Affiliate {
  id: string;
  affiliate_id: number;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  upfront_rate: number;
  residual_rate: number;
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'standard';
  total_sales: number;
  total_commissions: number;
  onboarding_status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  assigned_manager_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionEntry {
  id: string;
  affiliate_id: string;
  affiliatewp_referral_id: number;
  commission_type: 'upfront' | 'residual';
  customer_name: string;
  customer_email: string;
  product_name: string;
  product_id: number;
  order_total: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  notes?: string;
  webhook_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  affiliate?: Affiliate;
}

export interface AffiliateRateHistory {
  id: string;
  affiliate_id: string;
  previous_upfront_rate?: number;
  new_upfront_rate: number;
  previous_residual_rate?: number;
  new_residual_rate: number;
  reason?: string;
  changed_by?: string;
  effective_date: string;
  created_at: string;
}

export interface CommissionRateTemplate {
  id: string;
  name: string;
  description?: string;
  upfront_rate: number;
  residual_rate: number;
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'standard';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface CommissionStats {
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  approvedCommissions: number;
  totalRevenue: number;
  activeAffiliates: number;
  avgCommissionRate: number;
  monthlyGrowth: number;
}

export interface BulkRateUpdate {
  affiliate_ids: string[];
  upfront_rate?: number;
  residual_rate?: number;
  tier_level?: string;
  reason: string;
}

export const commissionService = {
  // Affiliate Management
  async getAffiliates(): Promise<Affiliate[]> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      throw error;
    }
  },

  async createAffiliate(affiliateData: Partial<Affiliate>): Promise<Affiliate> {
    try {
      // Get default template rates if not provided
      if (!affiliateData.upfront_rate || !affiliateData.residual_rate) {
        const defaultTemplate = await this.getDefaultRateTemplate();
        if (defaultTemplate) {
          affiliateData.upfront_rate = affiliateData.upfront_rate || defaultTemplate.upfront_rate;
          affiliateData.residual_rate = affiliateData.residual_rate || defaultTemplate.residual_rate;
          affiliateData.tier_level = affiliateData.tier_level || defaultTemplate.tier_level;
        }
      }

      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          ...affiliateData,
          onboarding_status: 'pending',
          total_sales: 0,
          total_commissions: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating affiliate:', error);
      throw error;
    }
  },

  async updateAffiliate(affiliateId: string, updates: Partial<Affiliate>): Promise<Affiliate> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating affiliate:', error);
      throw error;
    }
  },

  async updateAffiliateRates(
    affiliateId: string, 
    upfrontRate: number, 
    residualRate: number, 
    reason?: string
  ): Promise<Affiliate> {
    try {
      // Validate rates
      if (upfrontRate < 0 || upfrontRate > 100 || residualRate < 0 || residualRate > 100) {
        throw new Error('Commission rates must be between 0 and 100');
      }

      const { data, error } = await supabase
        .from('affiliates')
        .update({
          upfront_rate: upfrontRate,
          residual_rate: residualRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;

      // Rate history will be automatically tracked by the trigger
      return data;
    } catch (error) {
      console.error('Error updating affiliate rates:', error);
      throw error;
    }
  },

  async bulkUpdateRates(bulkUpdate: BulkRateUpdate): Promise<void> {
    try {
      const updates: Partial<Affiliate> = {
        updated_at: new Date().toISOString()
      };

      if (bulkUpdate.upfront_rate !== undefined) {
        updates.upfront_rate = bulkUpdate.upfront_rate;
      }
      if (bulkUpdate.residual_rate !== undefined) {
        updates.residual_rate = bulkUpdate.residual_rate;
      }
      if (bulkUpdate.tier_level) {
        updates.tier_level = bulkUpdate.tier_level as Affiliate['tier_level'];
      }

      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .in('id', bulkUpdate.affiliate_ids);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk updating rates:', error);
      throw error;
    }
  },

  async deleteAffiliate(affiliateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      throw error;
    }
  },

  // Rate History Management
  async getAffiliateRateHistory(affiliateId: string): Promise<AffiliateRateHistory[]> {
    try {
      const { data, error } = await supabase
        .from('affiliate_rate_history')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('effective_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliate rate history:', error);
      throw error;
    }
  },

  async addRateHistoryEntry(
    affiliateId: string,
    previousUpfrontRate: number,
    newUpfrontRate: number,
    previousResidualRate: number,
    newResidualRate: number,
    reason?: string
  ): Promise<AffiliateRateHistory> {
    try {
      const { data, error } = await supabase
        .from('affiliate_rate_history')
        .insert({
          affiliate_id: affiliateId,
          previous_upfront_rate: previousUpfrontRate,
          new_upfront_rate: newUpfrontRate,
          previous_residual_rate: previousResidualRate,
          new_residual_rate: newResidualRate,
          reason: reason || 'Rate updated'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding rate history entry:', error);
      throw error;
    }
  },

  // Commission Rate Templates
  async getRateTemplates(): Promise<CommissionRateTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .select('*')
        .eq('is_active', true)
        .order('tier_level', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rate templates:', error);
      throw error;
    }
  },

  async getDefaultRateTemplate(): Promise<CommissionRateTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching default rate template:', error);
      return null;
    }
  },

  async createRateTemplate(templateData: Partial<CommissionRateTemplate>): Promise<CommissionRateTemplate> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating rate template:', error);
      throw error;
    }
  },

  async updateRateTemplate(templateId: string, updates: Partial<CommissionRateTemplate>): Promise<CommissionRateTemplate> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating rate template:', error);
      throw error;
    }
  },

  async applyTemplateToAffiliate(affiliateId: string, templateId: string): Promise<Affiliate> {
    try {
      const template = await this.getRateTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return await this.updateAffiliateRates(
        affiliateId,
        template.upfront_rate,
        template.residual_rate,
        `Applied template: ${template.name}`
      );
    } catch (error) {
      console.error('Error applying template to affiliate:', error);
      throw error;
    }
  },

  async getRateTemplateById(templateId: string): Promise<CommissionRateTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching rate template by ID:', error);
      return null;
    }
  },

  // Commission Entry Management
  async getCommissionEntries(): Promise<CommissionEntry[]> {
    try {
      const { data, error } = await supabase
        .from('commission_entries')
        .select(`
          *,
          affiliate:affiliates(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching commission entries:', error);
      throw error;
    }
  },

  async getCommissionEntriesByAffiliate(affiliateId: string): Promise<CommissionEntry[]> {
    try {
      const { data, error } = await supabase
        .from('commission_entries')
        .select(`
          *,
          affiliate:affiliates(*)
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliate commission entries:', error);
      throw error;
    }
  },

  async updateCommissionStatus(entryId: string, status: CommissionEntry['status']): Promise<CommissionEntry> {
    try {
      const updates: Partial<CommissionEntry> = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      if (status === 'paid') {
        updates.payment_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('commission_entries')
        .update(updates)
        .eq('id', entryId)
        .select(`
          *,
          affiliate:affiliates(*)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating commission status:', error);
      throw error;
    }
  },

  // Onboarding Workflow
  async updateOnboardingStatus(
    affiliateId: string, 
    status: Affiliate['onboarding_status']
  ): Promise<Affiliate> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({
          onboarding_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      throw error;
    }
  },

  async getAffiliatesByOnboardingStatus(status: Affiliate['onboarding_status']): Promise<Affiliate[]> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('onboarding_status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliates by onboarding status:', error);
      throw error;
    }
  },

  // Validation and Conflict Resolution
  async validateRates(upfrontRate: number, residualRate: number): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (upfrontRate < 0 || upfrontRate > 100) {
      errors.push('Upfront rate must be between 0 and 100');
    }

    if (residualRate < 0 || residualRate > 100) {
      errors.push('Residual rate must be between 0 and 100');
    }

    if (upfrontRate + residualRate > 100) {
      errors.push('Combined rates cannot exceed 100%');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  async checkRateConflicts(affiliateId: string, newRates: { upfront_rate: number; residual_rate: number }): Promise<string[]> {
    const conflicts: string[] = [];

    try {
      // Check if rates are significantly different from tier standards
      const affiliate = await this.getAffiliateById(affiliateId);
      if (affiliate?.tier_level) {
        const tierTemplate = await this.getTemplateByTier(affiliate.tier_level);
        if (tierTemplate) {
          const upfrontDiff = Math.abs(newRates.upfront_rate - tierTemplate.upfront_rate);
          const residualDiff = Math.abs(newRates.residual_rate - tierTemplate.residual_rate);

          if (upfrontDiff > 5) {
            conflicts.push(`Upfront rate differs significantly from ${affiliate.tier_level} tier standard (${tierTemplate.upfront_rate}%)`);
          }
          if (residualDiff > 3) {
            conflicts.push(`Residual rate differs significantly from ${affiliate.tier_level} tier standard (${tierTemplate.residual_rate}%)`);
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking rate conflicts:', error);
      return [];
    }
  },

  async getAffiliateById(affiliateId: string): Promise<Affiliate | null> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching affiliate by ID:', error);
      return null;
    }
  },

  async getTemplateByTier(tierLevel: string): Promise<CommissionRateTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('commission_rate_templates')
        .select('*')
        .eq('tier_level', tierLevel)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching template by tier:', error);
      return null;
    }
  },

  // Webhook Log Management
  async getWebhookLogs(limit: number = 100): Promise<WebhookLog[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      throw error;
    }
  },

  async retryFailedWebhook(logId: string): Promise<void> {
    try {
      const { data: log, error: fetchError } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (fetchError) throw fetchError;

      // Increment retry count
      const { error: updateError } = await supabase
        .from('webhook_logs')
        .update({ 
          retry_count: log.retry_count + 1,
          error_message: null 
        })
        .eq('id', logId);

      if (updateError) throw updateError;

      console.log('Webhook retry initiated for log:', logId);
    } catch (error) {
      console.error('Error retrying webhook:', error);
      throw error;
    }
  },

  // Analytics and Reporting
  async getCommissionStats(): Promise<CommissionStats> {
    try {
      const [affiliates, commissionEntries] = await Promise.all([
        this.getAffiliates(),
        this.getCommissionEntries()
      ]);

      const totalCommissions = commissionEntries.reduce((sum, entry) => sum + entry.commission_amount, 0);
      const paidCommissions = commissionEntries
        .filter(entry => entry.status === 'paid')
        .reduce((sum, entry) => sum + entry.commission_amount, 0);
      const pendingCommissions = commissionEntries
        .filter(entry => entry.status === 'pending')
        .reduce((sum, entry) => sum + entry.commission_amount, 0);
      const approvedCommissions = commissionEntries
        .filter(entry => entry.status === 'approved')
        .reduce((sum, entry) => sum + entry.commission_amount, 0);

      return {
        totalCommissions,
        paidCommissions,
        pendingCommissions,
        approvedCommissions,
        totalRevenue: commissionEntries.reduce((sum, entry) => sum + entry.order_total, 0),
        activeAffiliates: affiliates.filter(a => a.status === 'active').length,
        avgCommissionRate: affiliates.length > 0 
          ? affiliates.reduce((sum, a) => sum + a.upfront_rate, 0) / affiliates.length 
          : 0,
        monthlyGrowth: 15 // This would be calculated based on historical data
      };
    } catch (error) {
      console.error('Error calculating commission stats:', error);
      throw error;
    }
  },

  // Export Functions
  async exportCommissionData(filters?: {
    startDate?: string;
    endDate?: string;
    affiliateId?: string;
    status?: string;
  }): Promise<string> {
    try {
      let query = supabase
        .from('commission_entries')
        .select(`
          *,
          affiliate:affiliates(*)
        `);

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.affiliateId) {
        query = query.eq('affiliate_id', filters.affiliateId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = [
        'Date',
        'Affiliate Name',
        'Affiliate ID',
        'Customer Name',
        'Customer Email',
        'Product Name',
        'Commission Type',
        'Order Total',
        'Commission Amount',
        'Commission Rate',
        'Status',
        'Payment Date'
      ];

      const csvData = [
        headers.join(','),
        ...(data || []).map(entry => [
          new Date(entry.created_at).toLocaleDateString(),
          entry.affiliate?.name || 'Unknown',
          entry.affiliate?.affiliate_id || 'N/A',
          entry.customer_name,
          entry.customer_email,
          entry.product_name,
          entry.commission_type,
          entry.order_total.toFixed(2),
          entry.commission_amount.toFixed(2),
          `${entry.commission_rate}%`,
          entry.status,
          entry.payment_date ? new Date(entry.payment_date).toLocaleDateString() : 'Not paid'
        ].join(','))
      ].join('\n');

      return csvData;
    } catch (error) {
      console.error('Error exporting commission data:', error);
      throw error;
    }
  },

  // Tier Management
  async promoteAffiliateToTier(affiliateId: string, newTier: Affiliate['tier_level']): Promise<Affiliate> {
    try {
      const template = await this.getTemplateByTier(newTier);
      if (!template) {
        throw new Error(`No template found for tier: ${newTier}`);
      }

      const { data, error } = await supabase
        .from('affiliates')
        .update({
          tier_level: newTier,
          upfront_rate: template.upfront_rate,
          residual_rate: template.residual_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error promoting affiliate to tier:', error);
      throw error;
    }
  },

  // PROFILE INTEGRATION
  async linkCommissionToProfile(affiliateWpId: number, commissionEntryId: string): Promise<void> {
    try {
      // Find the profile with this AffiliateWP ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('affiliatewp_id', affiliateWpId)
        .maybeSingle();

      if (profileError) {
        console.error('Error finding profile for affiliate:', profileError);
        return;
      }

      if (profile) {
        // Update the commission entry to link to the profile
        const { error: updateError } = await supabase
          .from('commission_entries')
          .update({ 
            linked_profile_id: profile.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', commissionEntryId);

        if (updateError) {
          console.error('Error linking commission to profile:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in commission-profile linking:', error);
    }
  },

  // Performance Tracking
  async updateAffiliatePerformance(affiliateId: string): Promise<void> {
    try {
      const commissions = await this.getCommissionEntriesByAffiliate(affiliateId);

      const totalSales = commissions.reduce((sum, entry) => sum + entry.order_total, 0);
      const totalCommissions = commissions.reduce((sum, entry) => sum + entry.commission_amount, 0);

      await this.updateAffiliate(affiliateId, {
        total_sales: totalSales,
        total_commissions: totalCommissions
      });
    } catch (error) {
      console.error('Error updating affiliate performance:', error);
      throw error;
    }
  },

  // AffiliateWP Integration - Referrals
  async getAffiliateReferrals(affiliateWpId: number, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', affiliateWpId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliate referrals:', error);
      throw error;
    }
  },

  // AffiliateWP Integration - Daily Metrics
  async getAffiliateMetrics(affiliateWpId: number, days = 30): Promise<any[]> {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('affiliate_metrics_daily')
        .select('*')
        .eq('affiliate_id', affiliateWpId)
        .gte('date', since)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching affiliate metrics:', error);
      throw error;
    }
  }
};