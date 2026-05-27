-- Migration: Add tipo_juridico column to company_profile
-- Date: 2026-05-26
-- Author: Antigravity

ALTER TABLE public.company_profile 
ADD COLUMN IF NOT EXISTS tipo_juridico VARCHAR(50) CHECK (tipo_juridico IN ('Unipersonal', 'S.R.L.', 'S.A.', 'S.A.S.', 'S.H.'));

COMMENT ON COLUMN public.company_profile.tipo_juridico IS 'Forma juridica o tipo societario de la empresa (Unipersonal, S.R.L., S.A., S.A.S., S.H.).';
