/*
  # Create Default Deal Stages

  1. New Tables
    - Creates default deal stages for all companies
  2. Security
    - Maintains existing RLS policies
  3. Changes
    - Adds standard sales pipeline stages with appropriate probabilities
*/

-- Insert default deal stages for existing companies
DO $$
DECLARE
    company_record RECORD;
BEGIN
    -- Loop through all existing companies (profiles)
    FOR company_record IN 
        SELECT id FROM profiles 
    LOOP
        -- Insert default deal stages for each company
        INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage, is_active) VALUES
        (company_record.id, 'Lead', 'Initial contact or inquiry', 1, 10, true),
        (company_record.id, 'Qualified', 'Lead has been qualified and shows interest', 2, 25, true),
        (company_record.id, 'Demo Scheduled', 'Product demonstration scheduled', 3, 40, true),
        (company_record.id, 'Demo Completed', 'Product demonstration completed successfully', 4, 60, true),
        (company_record.id, 'Proposal Sent', 'Proposal or quote has been sent', 5, 75, true),
        (company_record.id, 'Negotiating', 'In active negotiations', 6, 85, true),
        (company_record.id, 'Closed Won', 'Deal successfully closed', 7, 100, true),
        (company_record.id, 'Closed Lost', 'Deal was lost', 8, 0, true)
        ON CONFLICT DO NOTHING; -- Prevent duplicates if stages already exist
    END LOOP;
END $$;

-- Create a function to automatically create deal stages for new companies
CREATE OR REPLACE FUNCTION create_default_deal_stages()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default deal stages for the new company
    INSERT INTO deal_stages (company_id, name, description, order_index, probability_percentage, is_active) VALUES
    (NEW.id, 'Lead', 'Initial contact or inquiry', 1, 10, true),
    (NEW.id, 'Qualified', 'Lead has been qualified and shows interest', 2, 25, true),
    (NEW.id, 'Demo Scheduled', 'Product demonstration scheduled', 3, 40, true),
    (NEW.id, 'Demo Completed', 'Product demonstration completed successfully', 4, 60, true),
    (NEW.id, 'Proposal Sent', 'Proposal or quote has been sent', 5, 75, true),
    (NEW.id, 'Negotiating', 'In active negotiations', 6, 85, true),
    (NEW.id, 'Closed Won', 'Deal successfully closed', 7, 100, true),
    (NEW.id, 'Closed Lost', 'Deal was lost', 8, 0, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create deal stages for new companies
DROP TRIGGER IF EXISTS create_deal_stages_for_new_company ON profiles;
CREATE TRIGGER create_deal_stages_for_new_company
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_deal_stages();