-- ============================================
-- UAP Archive - Schéma de base de données
-- ============================================

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: videos
-- ============================================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
    video_id VARCHAR(100) NOT NULL,
    original_url TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    real_deal_count INTEGER DEFAULT 0,
    dont_buy_count INTEGER DEFAULT 0,
    flag_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    submitter_fingerprint VARCHAR(64), -- Pour limiter les soumissions par utilisateur
    
    -- Empêcher les doublons de vidéos
    UNIQUE(platform, video_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_videos_submitted_at ON videos(submitted_at DESC);
CREATE INDEX idx_videos_credibility ON videos((real_deal_count::float / NULLIF(real_deal_count + dont_buy_count, 0)) DESC NULLS LAST);
CREATE INDEX idx_videos_is_deleted ON videos(is_deleted);

-- ============================================
-- TABLE: votes
-- ============================================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    voter_fingerprint VARCHAR(64) NOT NULL,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('real', 'fake')),
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_hash VARCHAR(64), -- Hash de l'IP pour détection d'abus
    
    -- Un fingerprint ne peut voter qu'une fois par vidéo
    UNIQUE(video_id, voter_fingerprint)
);

CREATE INDEX idx_votes_video_id ON votes(video_id);
CREATE INDEX idx_votes_fingerprint ON votes(voter_fingerprint);

-- ============================================
-- TABLE: flags
-- ============================================
CREATE TABLE flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    flagger_fingerprint VARCHAR(64) NOT NULL,
    reason VARCHAR(50) DEFAULT 'inappropriate',
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un fingerprint ne peut flagger qu'une fois par vidéo
    UNIQUE(video_id, flagger_fingerprint)
);

CREATE INDEX idx_flags_video_id ON flags(video_id);

-- ============================================
-- TABLE: rate_limits (pour anti-spam)
-- ============================================
CREATE TABLE rate_limits (
    fingerprint VARCHAR(64) PRIMARY KEY,
    action_type VARCHAR(20) NOT NULL, -- 'vote', 'submit', 'flag'
    action_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(fingerprint, action_type)
);

-- ============================================
-- FONCTION: Mettre à jour les compteurs de votes
-- ============================================
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'real' THEN
            UPDATE videos SET real_deal_count = real_deal_count + 1 WHERE id = NEW.video_id;
        ELSE
            UPDATE videos SET dont_buy_count = dont_buy_count + 1 WHERE id = NEW.video_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'real' THEN
            UPDATE videos SET real_deal_count = real_deal_count - 1 WHERE id = OLD.video_id;
        ELSE
            UPDATE videos SET dont_buy_count = dont_buy_count - 1 WHERE id = OLD.video_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_counts
AFTER INSERT OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- ============================================
-- FONCTION: Mettre à jour le compteur de flags
-- et supprimer auto si seuil atteint
-- ============================================
CREATE OR REPLACE FUNCTION update_flag_count()
RETURNS TRIGGER AS $$
DECLARE
    current_video videos%ROWTYPE;
    flag_threshold INTEGER;
BEGIN
    -- Incrémenter le compteur
    UPDATE videos 
    SET flag_count = flag_count + 1 
    WHERE id = NEW.video_id
    RETURNING * INTO current_video;
    
    -- Calculer le seuil (plus élevé pour les vidéos populaires/crédibles)
    flag_threshold := 10; -- Seuil de base
    
    -- Si la vidéo a un bon score de crédibilité (>70%), doubler le seuil
    IF current_video.real_deal_count + current_video.dont_buy_count > 10 THEN
        IF (current_video.real_deal_count::float / (current_video.real_deal_count + current_video.dont_buy_count)) > 0.7 THEN
            flag_threshold := 20;
        END IF;
    END IF;
    
    -- Supprimer si seuil atteint
    IF current_video.flag_count >= flag_threshold THEN
        UPDATE videos SET is_deleted = TRUE WHERE id = NEW.video_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_flag_count
AFTER INSERT ON flags
FOR EACH ROW EXECUTE FUNCTION update_flag_count();

-- ============================================
-- FONCTION: Vérifier le rate limit
-- ============================================
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_fingerprint VARCHAR(64),
    p_action_type VARCHAR(20),
    p_max_actions INTEGER,
    p_window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_record rate_limits%ROWTYPE;
BEGIN
    SELECT * INTO current_record 
    FROM rate_limits 
    WHERE fingerprint = p_fingerprint AND action_type = p_action_type;
    
    IF NOT FOUND THEN
        -- Premier action, créer l'entrée
        INSERT INTO rate_limits (fingerprint, action_type, action_count, window_start)
        VALUES (p_fingerprint, p_action_type, 1, NOW());
        RETURN TRUE;
    END IF;
    
    -- Vérifier si la fenêtre est expirée
    IF current_record.window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
        -- Reset la fenêtre
        UPDATE rate_limits 
        SET action_count = 1, window_start = NOW()
        WHERE fingerprint = p_fingerprint AND action_type = p_action_type;
        RETURN TRUE;
    END IF;
    
    -- Vérifier si limite atteinte
    IF current_record.action_count >= p_max_actions THEN
        RETURN FALSE;
    END IF;
    
    -- Incrémenter le compteur
    UPDATE rate_limits 
    SET action_count = action_count + 1
    WHERE fingerprint = p_fingerprint AND action_type = p_action_type;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies pour videos: tout le monde peut lire les vidéos non supprimées
CREATE POLICY "Videos are viewable by everyone" ON videos
    FOR SELECT USING (is_deleted = FALSE);

-- Policies pour videos: insertion via fonction seulement (edge function)
CREATE POLICY "Videos are insertable via service role" ON videos
    FOR INSERT WITH CHECK (TRUE);

-- Policies pour votes: lecture publique pour vérifier si déjà voté
CREATE POLICY "Votes are viewable by everyone" ON votes
    FOR SELECT USING (TRUE);

-- Policies pour votes: insertion via service role
CREATE POLICY "Votes are insertable via service role" ON votes
    FOR INSERT WITH CHECK (TRUE);

-- Policies pour flags: insertion via service role
CREATE POLICY "Flags are insertable via service role" ON flags
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- DONNÉES DE DÉMO (optionnel)
-- ============================================
INSERT INTO videos (platform, video_id, original_url, title, real_deal_count, dont_buy_count, submitted_at)
VALUES 
    ('youtube', 'SKsLK_Na7iw', 'https://youtube.com/watch?v=SKsLK_Na7iw', 'Navy Pilot UFO Encounter - Official Pentagon Release', 847, 234, NOW() - INTERVAL '3 days'),
    ('youtube', 'rO_M0hLlJ-Q', 'https://youtube.com/watch?v=rO_M0hLlJ-Q', 'GIMBAL UFO - Declassified Navy Footage', 1203, 156, NOW() - INTERVAL '7 days'),
    ('youtube', 'VUrTsrhVce4', 'https://youtube.com/watch?v=VUrTsrhVce4', 'GO FAST - Official UAP Footage', 956, 312, NOW() - INTERVAL '5 days');
