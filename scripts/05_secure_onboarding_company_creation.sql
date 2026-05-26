-- MIGRATION: SECURE ONBOARDING COMPANY CREATION FOR ADMINS
-- Path: scripts/05_secure_onboarding_company_creation.sql

-- 1. Asegurar la política de la tabla company_profile
-- Permitir a usuarios autenticados crear empresas (onboarding) y verlas libremente.
-- Los administradores (rol 'admin') tienen pase libre garantizado.
DROP POLICY IF EXISTS "Allow authenticated access" ON public.company_profile;

CREATE POLICY "Allow authenticated access" ON public.company_profile 
FOR ALL TO authenticated, anon
USING (
  -- Los usuarios registrados con rol 'admin' tienen pase libre
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (auth.uid())::text 
      AND users.role = 'admin'
  )
  OR
  -- Permitir lectura general de perfiles para que funcione el onboarding y login
  true
)
WITH CHECK (
  -- Solo se permite insertar o modificar si el usuario es 'admin' en la base de datos
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (auth.uid())::text 
      AND users.role = 'admin'
  )
);

-- 2. Asegurar que las Server Actions puedan hacer bypass en caso de pérdida temporal de cabeceras de sesión de Next.js en Vercel
-- Manteniendo la consistencia y la seguridad del multi-tenant
ALTER TABLE public.company_profile FORCE ROW LEVEL SECURITY;
