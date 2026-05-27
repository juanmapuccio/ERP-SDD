-- Migration: Add monotributo_categoria column to company_profile
-- Date: 2026-05-26
-- Author: Antigravity

ALTER TABLE public.company_profile 
ADD COLUMN IF NOT EXISTS monotributo_categoria VARCHAR(2) CHECK (monotributo_categoria IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'));

COMMENT ON COLUMN public.company_profile.monotributo_categoria IS 'Letra de la categoria de Monotributo nacional (A a K) si la condicion de IVA es Monotributista.';
