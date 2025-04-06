-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_sid TEXT NOT NULL,
    caller TEXT NOT NULL,
    status TEXT NOT NULL,
    duration TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recording_url TEXT NOT NULL,
    recording_sid TEXT NOT NULL,
    transcription TEXT,
    call_sid TEXT NOT NULL,
    session_id UUID REFERENCES sessions(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_recordings_call_sid ON recordings(call_sid);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(session_id);

-- Add RLS policies
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON call_logs
    FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Allow full access to authenticated users" ON recordings
    FOR ALL
    TO authenticated
    USING (true); 