-- =============================================
-- Notary Voice Agent - RLS Implementation
-- =============================================
-- This SQL script sets up the tables and RLS policies for the Notary Voice Agent application
-- Run this in your Supabase SQL Editor

-- Create private schema
CREATE SCHEMA IF NOT EXISTS private;

-- =============================================
-- Create tables
-- =============================================

-- Users/Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_id_unique UNIQUE (user_id)
);

-- Client table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions/Meetings table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  session_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  recording_url TEXT,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Create indexes for RLS optimization
-- =============================================
CREATE INDEX IF NOT EXISTS agents_user_id_idx ON agents(user_id);
CREATE INDEX IF NOT EXISTS clients_agent_id_idx ON clients(agent_id);
CREATE INDEX IF NOT EXISTS sessions_agent_id_idx ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS sessions_client_id_idx ON sessions(client_id);
CREATE INDEX IF NOT EXISTS documents_session_id_idx ON documents(session_id);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create security definer functions
-- =============================================

-- Create a security definer function to check agent ownership
CREATE OR REPLACE FUNCTION private.is_agent_owner(agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agents
    WHERE agents.id = is_agent_owner.agent_id
    AND agents.user_id = (select auth.uid())
  );
END;
$$;

-- Create a security definer function to check session ownership
CREATE OR REPLACE FUNCTION private.is_session_owner(session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions
    JOIN agents ON agents.id = sessions.agent_id
    WHERE sessions.id = is_session_owner.session_id
    AND agents.user_id = (select auth.uid())
  );
END;
$$;

-- =============================================
-- RLS Policies for Agents
-- =============================================

-- Users can view their own agent profile
CREATE POLICY "Users can view own agent profile"
ON agents
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Users can create their own agent profile
CREATE POLICY "Users can create own agent profile"
ON agents
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own agent profile
CREATE POLICY "Users can update own agent profile"
ON agents
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- =============================================
-- RLS Policies for Clients
-- =============================================

-- Agents can view their own clients
CREATE POLICY "Agents can view their own clients"
ON clients
FOR SELECT
TO authenticated
USING (private.is_agent_owner(agent_id));

-- Agents can create clients
CREATE POLICY "Agents can create clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (private.is_agent_owner(agent_id));

-- Agents can update their own clients
CREATE POLICY "Agents can update their own clients"
ON clients
FOR UPDATE
TO authenticated
USING (private.is_agent_owner(agent_id))
WITH CHECK (private.is_agent_owner(agent_id));

-- Agents can delete their own clients
CREATE POLICY "Agents can delete their own clients"
ON clients
FOR DELETE
TO authenticated
USING (private.is_agent_owner(agent_id));

-- =============================================
-- RLS Policies for Sessions
-- =============================================

-- Agents can view their own sessions
CREATE POLICY "Agents can view their own sessions"
ON sessions
FOR SELECT
TO authenticated
USING (private.is_agent_owner(agent_id));

-- Agents can create sessions
CREATE POLICY "Agents can create sessions"
ON sessions
FOR INSERT
TO authenticated
WITH CHECK (private.is_agent_owner(agent_id));

-- Agents can update their own sessions
CREATE POLICY "Agents can update their own sessions"
ON sessions
FOR UPDATE
TO authenticated
USING (private.is_agent_owner(agent_id))
WITH CHECK (private.is_agent_owner(agent_id));

-- Agents can delete their own sessions
CREATE POLICY "Agents can delete their own sessions"
ON sessions
FOR DELETE
TO authenticated
USING (private.is_agent_owner(agent_id));

-- =============================================
-- RLS Policies for Documents
-- =============================================

-- Agents can view documents from their sessions
CREATE POLICY "Agents can view their session documents"
ON documents
FOR SELECT
TO authenticated
USING (private.is_session_owner(session_id));

-- Agents can create documents for their sessions
CREATE POLICY "Agents can create documents for their sessions"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (private.is_session_owner(session_id));

-- Agents can update documents for their sessions
CREATE POLICY "Agents can update documents for their sessions"
ON documents
FOR UPDATE
TO authenticated
USING (private.is_session_owner(session_id))
WITH CHECK (private.is_session_owner(session_id));

-- Agents can delete documents for their sessions
CREATE POLICY "Agents can delete documents for their sessions"
ON documents
FOR DELETE
TO authenticated
USING (private.is_session_owner(session_id));

-- =============================================
-- Admin Policies (Optional)
-- =============================================

-- Admins can view all agents
CREATE POLICY "Admins can view all agents"
ON agents
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

-- Admins can view all clients
CREATE POLICY "Admins can view all clients"
ON clients
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON sessions
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON documents
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

-- =============================================
-- Trigger for updated_at timestamps
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to tables with updated_at
CREATE TRIGGER agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); 