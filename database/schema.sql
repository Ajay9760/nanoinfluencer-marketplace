-- NanoInfluencer MarketPlace Database Schema
-- PostgreSQL with TimescaleDB for time-series data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- USERS table (base table for all user types)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('brand','influencer','admin')) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  phone TEXT,
  avatar_url TEXT,
  status TEXT CHECK (status IN ('active','inactive','suspended','pending')) DEFAULT 'pending',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- INFLUENCERS table (extends users for influencer-specific data)
CREATE TABLE influencers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  social_handles JSONB, -- [{"platform":"instagram","handle":"@username","followers":12000,"verified":true}]
  niche_tags TEXT[], -- ["fitness", "lifestyle", "food"]
  audience_demographics JSONB, -- {"gender":{"M":60,"F":40}, "age":{"18-24":30,"25-34":45}, "regions":{"IN":70,"US":20,"UK":10}}
  influence_score NUMERIC(5,2) DEFAULT 0, -- AI-calculated score 0-100
  engagement_rate NUMERIC(5,2), -- Average engagement rate percentage
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  verified_engagement BOOLEAN DEFAULT false,
  verification_documents JSONB, -- Screenshots, verification proofs
  preferred_campaign_types TEXT[], -- ["awareness", "conversions", "ugc"]
  min_campaign_budget NUMERIC(10,2),
  location JSONB, -- {"city": "Mumbai", "state": "Maharashtra", "country": "India", "lat": 19.0760, "lng": 72.8777}
  languages TEXT[], -- ["English", "Hindi", "Marathi"]
  content_categories TEXT[], -- ["reels", "stories", "posts", "youtube_shorts"]
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_influencers_niche_tags ON influencers USING GIN(niche_tags);
CREATE INDEX idx_influencers_influence_score ON influencers(influence_score DESC);
CREATE INDEX idx_influencers_total_followers ON influencers(total_followers);
CREATE INDEX idx_influencers_engagement_rate ON influencers(engagement_rate DESC);

-- BRANDS table (extends users for brand-specific data)
CREATE TABLE brands (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT, -- "fashion", "food", "tech", "health"
  company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'large')),
  gst_number TEXT,
  business_address JSONB,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  verification_documents JSONB, -- GST certificate, business license, etc.
  monthly_budget NUMERIC(10,2),
  preferred_campaign_goals TEXT[], -- ["awareness", "conversions", "engagement", "ugc"]
  target_markets TEXT[], -- ["India", "Southeast Asia"]
  brand_guidelines JSONB, -- Logo, colors, messaging guidelines
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_brands_industry ON brands(industry);
CREATE INDEX idx_brands_verification_status ON brands(verification_status);

-- CAMPAIGNS table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal TEXT CHECK (goal IN ('awareness','conversions','engagement','ugc','brand_mention')) NOT NULL,
  budget NUMERIC(10,2) NOT NULL,
  budget_per_influencer NUMERIC(10,2),
  currency VARCHAR(5) DEFAULT 'INR',
  status TEXT CHECK (status IN ('draft','active','paused','completed','cancelled')) DEFAULT 'draft',
  
  -- Campaign targeting
  target_audience JSONB, -- {"age_range": [18,35], "gender": ["F"], "interests": ["fitness"], "locations": ["Mumbai", "Delhi"]}
  target_follower_range JSONB, -- {"min": 1000, "max": 50000}
  target_engagement_rate NUMERIC(5,2), -- Minimum engagement rate required
  target_niches TEXT[],
  
  -- Content requirements
  content_requirements JSONB, -- {"platforms": ["instagram"], "content_types": ["post", "story"], "hashtags": ["#brand"], "mentions": ["@brand"]}
  content_guidelines TEXT, -- Detailed brief
  sample_content_urls TEXT[], -- Reference content URLs
  prohibited_content TEXT[], -- What not to include
  
  -- Campaign timeline
  application_deadline TIMESTAMP,
  content_submission_deadline TIMESTAMP,
  campaign_start_date TIMESTAMP,
  campaign_end_date TIMESTAMP,
  
  -- Analytics tracking
  utm_parameters JSONB, -- For conversion tracking
  tracking_pixels TEXT[],
  custom_landing_page TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_goal ON campaigns(goal);
CREATE INDEX idx_campaigns_budget ON campaigns(budget DESC);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- CAMPAIGN_APPLICATIONS table (many-to-many relationship)
CREATE TABLE campaign_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  influencer_id UUID NOT NULL REFERENCES users(id),
  status TEXT CHECK (status IN ('pending','accepted','rejected','withdrawn')) DEFAULT 'pending',
  proposed_rate NUMERIC(10,2), -- Influencer's proposed rate
  brand_offered_rate NUMERIC(10,2), -- Counter-offer from brand
  final_rate NUMERIC(10,2), -- Agreed rate
  application_message TEXT, -- Influencer's pitch
  brand_feedback TEXT, -- Brand's response/feedback
  applied_at TIMESTAMP DEFAULT now(),
  responded_at TIMESTAMP,
  
  UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_campaign_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX idx_campaign_applications_influencer_id ON campaign_applications(influencer_id);
CREATE INDEX idx_campaign_applications_status ON campaign_applications(status);

-- CAMPAIGN_DELIVERABLES table (content submitted by influencers)
CREATE TABLE campaign_deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  influencer_id UUID NOT NULL REFERENCES users(id),
  application_id UUID REFERENCES campaign_applications(id),
  
  -- Content details
  platform TEXT NOT NULL, -- "instagram", "tiktok", "youtube"
  content_type TEXT NOT NULL, -- "post", "story", "reel", "video"
  content_url TEXT NOT NULL, -- URL to the published content
  content_screenshot TEXT, -- Screenshot URL for verification
  
  -- Engagement metrics (updated periodically)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0, -- UTM tracking
  
  -- Approval workflow
  status TEXT CHECK (status IN ('draft','submitted','under_review','approved','rejected','published','completed')) DEFAULT 'draft',
  brand_feedback TEXT,
  revision_notes TEXT,
  approval_date TIMESTAMP,
  publish_date TIMESTAMP,
  
  -- Payment tracking
  payout_amount NUMERIC(10,2),
  payout_status TEXT CHECK (payout_status IN ('pending','processing','completed','failed')) DEFAULT 'pending',
  payout_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_deliverables_campaign_id ON campaign_deliverables(campaign_id);
CREATE INDEX idx_deliverables_influencer_id ON campaign_deliverables(influencer_id);
CREATE INDEX idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX idx_deliverables_platform ON campaign_deliverables(platform);

-- Convert deliverables to hypertable for time-series analytics
SELECT create_hypertable('campaign_deliverables', 'created_at', if_not_exists => TRUE);

-- WALLETS table (for escrow and payments)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  balance NUMERIC(10,2) DEFAULT 0,
  escrow_balance NUMERIC(10,2) DEFAULT 0, -- Funds held in escrow
  currency VARCHAR(5) DEFAULT 'INR',
  bank_account_details JSONB, -- Encrypted bank details
  payment_methods JSONB, -- UPI, cards, etc.
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- TRANSACTIONS table (all financial transactions)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  amount NUMERIC(10,2) NOT NULL,
  type TEXT CHECK (type IN ('deposit','withdrawal','escrow_hold','escrow_release','payment','refund','commission')) NOT NULL,
  status TEXT CHECK (status IN ('pending','completed','failed','cancelled')) DEFAULT 'pending',
  reference_id UUID, -- campaign_id, deliverable_id, etc.
  reference_type TEXT, -- 'campaign', 'deliverable', 'withdrawal'
  payment_gateway TEXT, -- 'stripe', 'razorpay', 'paypal'
  gateway_transaction_id TEXT,
  gateway_response JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Convert transactions to hypertable for time-series analytics
SELECT create_hypertable('transactions', 'created_at', if_not_exists => TRUE);

-- REVIEWS table (mutual reviews between brands and influencers)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  review_categories JSONB, -- {"communication": 5, "quality": 4, "timeliness": 5}
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(campaign_id, reviewer_id, reviewee_id)
);

CREATE INDEX idx_reviews_campaign_id ON reviews(campaign_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ANALYTICS_EVENTS table (for detailed tracking)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- 'campaign_view', 'profile_view', 'application_submit', 'content_engagement'
  user_id UUID REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  deliverable_id UUID REFERENCES campaign_deliverables(id),
  event_data JSONB, -- Flexible event properties
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  timestamp TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);

-- Convert analytics events to hypertable
SELECT create_hypertable('analytics_events', 'timestamp', if_not_exists => TRUE);

-- NOTIFICATIONS table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- 'campaign_match', 'application_update', 'payment_received', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional context data
  read_at TIMESTAMP,
  action_url TEXT, -- Deep link to relevant page
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- AUDIT_LOG table (for compliance and debugging)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- AI_MODELS table (for ML model versioning)
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- 'influence_score', 'fraud_detection', 'campaign_matching'
  version TEXT NOT NULL,
  model_path TEXT, -- S3 path or local path
  parameters JSONB, -- Model hyperparameters
  metrics JSONB, -- Accuracy, precision, recall, etc.
  status TEXT CHECK (status IN ('training','testing','active','deprecated')) DEFAULT 'training',
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(name, version)
);

-- SYSTEM_SETTINGS table (for application configuration)
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT now()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('platform_commission_rate', '0.15', 'Platform commission percentage (15%)'),
  ('min_influence_score', '20', 'Minimum influence score required for campaigns'),
  ('max_campaign_duration_days', '90', 'Maximum campaign duration in days'),
  ('fraud_detection_threshold', '0.8', 'AI fraud detection confidence threshold');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON campaign_deliverables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active campaigns with brand info
CREATE VIEW active_campaigns_view AS
SELECT 
  c.*,
  b.company_name,
  b.industry,
  u.name as brand_contact_name,
  u.email as brand_contact_email
FROM campaigns c
JOIN brands b ON c.brand_id = b.id
JOIN users u ON b.id = u.id
WHERE c.status = 'active'
  AND c.application_deadline > now();

-- Influencer profiles with stats
CREATE VIEW influencer_profiles_view AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.avatar_url,
  i.*,
  COALESCE(stats.total_campaigns, 0) as total_campaigns,
  COALESCE(stats.avg_rating, 0) as avg_rating,
  COALESCE(stats.total_earnings, 0) as total_earnings
FROM users u
JOIN influencers i ON u.id = i.id
LEFT JOIN (
  SELECT 
    ca.influencer_id,
    COUNT(DISTINCT ca.campaign_id) as total_campaigns,
    AVG(r.rating) as avg_rating,
    SUM(cd.payout_amount) as total_earnings
  FROM campaign_applications ca
  LEFT JOIN reviews r ON ca.campaign_id = r.campaign_id AND r.reviewee_id = ca.influencer_id
  LEFT JOIN campaign_deliverables cd ON ca.campaign_id = cd.campaign_id AND ca.influencer_id = cd.influencer_id
  WHERE ca.status = 'accepted'
  GROUP BY ca.influencer_id
) stats ON u.id = stats.influencer_id
WHERE u.role = 'influencer' AND u.status = 'active';