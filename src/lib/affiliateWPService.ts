// AffiliateWP REST API Service

export interface AffiliateWPConfig {
  wpUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface AffiliateWPAffiliate {
  affiliate_id: number;
  user_id: number;
  user_login: string;
  user_email: string;
  user_nicename: string;
  payment_email: string;
  status: string;
  earnings: string;
  unpaid_earnings: string;
  paid_earnings: string;
  referrals: number;
  visits: number;
  date_registered: string;
}

export interface AffiliateWPReferral {
  referral_id: number;
  affiliate_id: number;
  visit_id: number;
  description: string;
  status: string;
  amount: string;
  currency: string;
  custom: string;
  context: string;
  campaign: string;
  reference: string;
  products: any;
  date: string;
}

export interface AffiliateWPStats {
  earnings: number;
  unpaid_earnings: number;
  paid_earnings: number;
  referrals: number;
  visits: number;
  conversion_rate: number;
}

class AffiliateWPService {
  private config: AffiliateWPConfig | null = null;

  setConfig(config: AffiliateWPConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    if (!this.config) {
      throw new Error('AffiliateWP API not configured');
    }

    const url = new URL(`${this.config.wpUrl}/wp-json/affwp/v2/${endpoint}`);

    // Add query parameters for GET requests
    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`));
    headers.set('Content-Type', 'application/json');

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AffiliateWP API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Get all affiliates
  async getAffiliates(page: number = 1, perPage: number = 100): Promise<AffiliateWPAffiliate[]> {
    return this.makeRequest<AffiliateWPAffiliate[]>('affiliates', {
      number: perPage,
      offset: (page - 1) * perPage,
    });
  }

  // Get single affiliate by ID
  async getAffiliate(affiliateId: number): Promise<AffiliateWPAffiliate> {
    return this.makeRequest<AffiliateWPAffiliate>(`affiliates/${affiliateId}`);
  }

  // Get affiliate by email
  async getAffiliateByEmail(email: string): Promise<AffiliateWPAffiliate | null> {
    const affiliates = await this.makeRequest<AffiliateWPAffiliate[]>('affiliates', {
      search: email,
      number: 1,
    });
    return affiliates.length > 0 ? affiliates[0] : null;
  }

  // Create new affiliate
  async createAffiliate(data: {
    user_login: string;
    user_email: string;
    payment_email?: string;
    user_nicename?: string;
    rate?: number;
    rate_type?: string;
    status?: string;
  }): Promise<AffiliateWPAffiliate> {
    const body = {
      user_login: data.user_login,
      user_email: data.user_email,
      payment_email: data.payment_email || data.user_email,
      user_nicename: data.user_nicename || data.user_login,
      rate: data.rate || 0,
      rate_type: data.rate_type || 'percentage',
      status: data.status || 'active',
    };

    return this.makeRequest<AffiliateWPAffiliate>('affiliates', {}, 'POST', body);
  }

  // Get referrals for an affiliate
  async getReferrals(
    affiliateId?: number,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<AffiliateWPReferral[]> {
    const params: Record<string, any> = {
      number: perPage,
      offset: (page - 1) * perPage,
    };

    if (affiliateId) params.affiliate_id = affiliateId;
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return this.makeRequest<AffiliateWPReferral[]>('referrals', params);
  }

  // Get affiliate statistics
  async getAffiliateStats(affiliateId: number, dateFrom?: string, dateTo?: string): Promise<AffiliateWPStats> {
    const params: Record<string, any> = {
      affiliate_id: affiliateId,
    };

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return this.makeRequest<AffiliateWPStats>(`affiliates/${affiliateId}/stats`, params);
  }

  // Get all referrals for all affiliates
  async getAllReferrals(status?: string, dateFrom?: string, dateTo?: string): Promise<AffiliateWPReferral[]> {
    return this.getReferrals(undefined, status, dateFrom, dateTo);
  }
}

export const affiliateWPService = new AffiliateWPService();
