import { supabase } from './supabaseClient';

interface CreateAccountRequest {
  email: string;
  name: string;
  phone?: string;
  user_role: string;
  territory?: string;
  commission_rate?: number;
  affiliatewp_id?: number;
  position?: string;
  department?: string;
  employee_id?: string;
}

interface CreateAccountResponse {
  success: boolean;
  data?: {
    user_id: string;
    profile_id: string;
    team_member_id: string;
    email: string;
    temporary_password: string;
    name: string;
    user_role: string;
    affiliatewp_id?: number;
  };
  error?: string;
}

export interface TeamMember {
  id: string;
  profile_id: string;
  company_id: string;
  user_id?: string;
  employee_id?: string;
  hire_date: string;
  employment_status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  position?: string;
  department?: string;
  manager_id?: string;
  performance_rating?: number;
  last_review_date?: string;
  next_review_date?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    company_name: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
    user_role: string;
    territory?: string;
    commission_rate?: number;
    is_active: boolean;
  };
}

export interface TeamPerformanceHistory {
  id: string;
  team_member_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  revenue_generated: number;
  deals_closed: number;
  deals_lost: number;
  conversion_rate?: number;
  avg_deal_size?: number;
  quota_amount?: number;
  quota_attainment?: number;
  activities_completed: number;
  calls_made: number;
  emails_sent: number;
  meetings_held: number;
  performance_score?: number;
  notes?: string;
  created_at: string;
}

export interface TeamGoal {
  id: string;
  team_member_id: string;
  company_id: string;
  goal_type: string;
  goal_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  target_value: number;
  current_value: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
  start_date: string;
  end_date: string;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamTerritory {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  region?: string;
  states?: string[];
  zip_codes?: string[];
  assigned_member_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamSkill {
  id: string;
  team_member_id: string;
  company_id: string;
  skill_name: string;
  skill_category?: string;
  proficiency_level?: string;
  certification_name?: string;
  certification_number?: string;
  issue_date?: string;
  expiry_date?: string;
  verified: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamNote {
  id: string;
  team_member_id: string;
  company_id: string;
  note_type: string;
  title: string;
  content: string;
  rating?: number;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const teamService = {
  async getTeamMembers(companyId: string): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles!team_members_profile_id_fkey(
            id,
            company_name,
            company_email,
            company_phone,
            company_address,
            user_role,
            territory,
            commission_rate,
            is_active
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  },

  async getTeamMemberById(id: string): Promise<TeamMember | null> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles!team_members_profile_id_fkey(
            id,
            company_name,
            company_email,
            company_phone,
            company_address,
            user_role,
            territory,
            commission_rate,
            is_active
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching team member:', error);
      return null;
    }
  },

  async createTeamMember(companyId: string, memberData: Partial<TeamMember>): Promise<TeamMember> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          company_id: companyId,
          profile_id: memberData.profile_id,
          employee_id: memberData.employee_id,
          hire_date: memberData.hire_date || new Date().toISOString().split('T')[0],
          employment_status: memberData.employment_status || 'active',
          position: memberData.position,
          department: memberData.department,
          manager_id: memberData.manager_id,
          performance_rating: memberData.performance_rating,
          notes: memberData.notes,
          custom_fields: memberData.custom_fields || {}
        })
        .select(`
          *,
          profile:profiles!team_members_profile_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      await this.logActivity(data.id, companyId, 'member_added', `Team member ${memberData.employee_id || 'new member'} added`, companyId);

      return data;
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  },

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          profile:profiles!team_members_profile_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      await this.logActivity(id, data.company_id, 'member_updated', `Team member updated`, data.company_id);

      return data;
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  async deleteTeamMember(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  async getPerformanceHistory(teamMemberId: string): Promise<TeamPerformanceHistory[]> {
    try {
      const { data, error } = await supabase
        .from('team_performance_history')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching performance history:', error);
      return [];
    }
  },

  async addPerformanceRecord(record: Partial<TeamPerformanceHistory>): Promise<TeamPerformanceHistory> {
    try {
      const { data, error } = await supabase
        .from('team_performance_history')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding performance record:', error);
      throw error;
    }
  },

  async getGoals(teamMemberId: string): Promise<TeamGoal[]> {
    try {
      const { data, error } = await supabase
        .from('team_goals')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching goals:', error);
      return [];
    }
  },

  async createGoal(companyId: string, goal: Partial<TeamGoal>): Promise<TeamGoal> {
    try {
      const { data, error } = await supabase
        .from('team_goals')
        .insert({
          ...goal,
          company_id: companyId,
          created_by: companyId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  },

  async updateGoal(id: string, updates: Partial<TeamGoal>): Promise<TeamGoal> {
    try {
      const { data, error } = await supabase
        .from('team_goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  },

  async getTerritories(companyId: string): Promise<TeamTerritory[]> {
    try {
      const { data, error } = await supabase
        .from('team_territories')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching territories:', error);
      return [];
    }
  },

  async createTerritory(companyId: string, territory: Partial<TeamTerritory>): Promise<TeamTerritory> {
    try {
      const { data, error } = await supabase
        .from('team_territories')
        .insert({
          ...territory,
          company_id: companyId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating territory:', error);
      throw error;
    }
  },

  async updateTerritory(id: string, updates: Partial<TeamTerritory>): Promise<TeamTerritory> {
    try {
      const { data, error } = await supabase
        .from('team_territories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating territory:', error);
      throw error;
    }
  },

  async getSkills(teamMemberId: string): Promise<TeamSkill[]> {
    try {
      const { data, error } = await supabase
        .from('team_skills')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching skills:', error);
      return [];
    }
  },

  async addSkill(companyId: string, skill: Partial<TeamSkill>): Promise<TeamSkill> {
    try {
      const { data, error } = await supabase
        .from('team_skills')
        .insert({
          ...skill,
          company_id: companyId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    }
  },

  async getNotes(teamMemberId: string): Promise<TeamNote[]> {
    try {
      const { data, error } = await supabase
        .from('team_notes')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  },

  async addNote(companyId: string, note: Partial<TeamNote>): Promise<TeamNote> {
    try {
      const { data, error } = await supabase
        .from('team_notes')
        .insert({
          ...note,
          company_id: companyId,
          created_by: companyId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  },

  async logActivity(
    teamMemberId: string,
    companyId: string,
    activityType: string,
    description: string,
    performedBy: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('team_activity_log')
        .insert({
          team_member_id: teamMemberId,
          company_id: companyId,
          activity_type: activityType,
          description,
          performed_by: performedBy,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  async getActivityLog(teamMemberId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('team_activity_log')
        .select('*')
        .eq('team_member_id', teamMemberId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return [];
    }
  },

  async createTeamMemberWithAccount(
    companyId: string,
    accountData: CreateAccountRequest
  ): Promise<CreateAccountResponse['data']> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      const requestBody = {
        ...accountData,
        company_id: companyId,
      };

      console.log('=== Edge Function Call Debug ===');
      console.log('Session user ID:', session.user.id);
      console.log('Company ID:', companyId);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('Calling Edge Function at:', `${supabase.functions.invoke}`);

      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('create-sales-rep-account', {
        body: requestBody,
      });
      const duration = Date.now() - startTime;

      console.log('=== Edge Function Response ===');
      console.log('Duration:', duration, 'ms');
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('Response error:', JSON.stringify(error, null, 2));

      if (error) {
        console.error('=== Edge Function HTTP Error ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error context:', error.context);

        let errorMessage = 'Failed to create account';

        if (error.message) {
          if (error.message.includes('FunctionsRelayError') || error.message.includes('FunctionsHttpError')) {
            errorMessage = 'Edge Function error. Please check the function logs in Supabase dashboard for details.';
          } else {
            errorMessage = error.message;
          }
        } else if (error.context?.body) {
          errorMessage = error.context.body;
        } else if (typeof error === 'object' && Object.keys(error).length > 0) {
          errorMessage = JSON.stringify(error);
        }

        throw new Error(errorMessage);
      }

      if (!data) {
        console.error('=== No Response Data ===');
        throw new Error('No response data from Edge Function. The function may have timed out or crashed.');
      }

      console.log('=== Checking Response Data ===');
      console.log('data.success:', data.success);
      console.log('data.error:', data.error);
      console.log('data.details:', data.details);

      if (!data.success) {
        const errorMsg = data.error || data.details || 'Failed to create account';
        console.error('=== Edge Function Returned Error ===');
        console.error('Error message:', errorMsg);
        console.error('Full response:', data);

        let userFriendlyMessage = errorMsg;
        if (errorMsg.includes('already exists')) {
          userFriendlyMessage = errorMsg;
        } else if (errorMsg.includes('Unauthorized')) {
          userFriendlyMessage = 'You do not have permission to perform this action.';
        } else if (errorMsg.includes('Database error')) {
          userFriendlyMessage = `Database error: ${errorMsg}`;
        } else if (errorMsg.includes('Failed to create profile')) {
          userFriendlyMessage = `Profile creation failed: ${errorMsg}. This may be due to database permissions.`;
        } else if (errorMsg.includes('Failed to create team member')) {
          userFriendlyMessage = `Team member creation failed: ${errorMsg}. This may be due to database permissions.`;
        }

        throw new Error(userFriendlyMessage);
      }

      if (!data.data) {
        console.error('=== No Data in Response ===');
        throw new Error('No data returned from Edge Function despite success status');
      }

      console.log('=== Complete Success ===');
      console.log('Created account for:', data.data.email);
      console.log('User ID:', data.data.user_id);
      console.log('Profile ID:', data.data.profile_id);
      console.log('Team Member ID:', data.data.team_member_id);
      console.log('Temporary Password Present:', !!data.data.temporary_password);
      console.log('Temporary Password Length:', data.data.temporary_password?.length || 0);

      if (!data.data.temporary_password) {
        console.error('CRITICAL: No temporary_password in response! This will cause password display issues.');
        console.error('Response data structure:', Object.keys(data.data));
        console.error('Full response data:', data.data);

        throw new Error('Account created but temporary password was not returned. Please contact support or use password reset.');
      }

      return data.data;
    } catch (error) {
      console.error('=== Error Creating Team Member Account ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  },

  async resetTeamMemberPassword(
    teamMemberId: string,
    userId: string
  ): Promise<{ temporary_password: string; reset_at: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in and try again.');
      }

      console.log('=== Resetting Team Member Password ===');
      console.log('Team Member ID:', teamMemberId);
      console.log('User ID:', userId);

      const { data, error } = await supabase.functions.invoke('reset-rep-password', {
        body: {
          team_member_id: teamMemberId,
          user_id: userId,
        },
      });

      console.log('=== Password Reset Response ===');
      console.log('Response:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Password reset error:', error);
        throw new Error(error.message || 'Failed to reset password');
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to reset password';
        throw new Error(errorMsg);
      }

      if (!data.data || !data.data.temporary_password) {
        throw new Error('Password reset succeeded but temporary password not returned');
      }

      console.log('Password reset successful');
      return {
        temporary_password: data.data.temporary_password,
        reset_at: data.data.reset_at,
      };
    } catch (error) {
      console.error('Error resetting team member password:', error);
      throw error;
    }
  }
};
