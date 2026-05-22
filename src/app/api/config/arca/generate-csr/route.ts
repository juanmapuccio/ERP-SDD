import { NextResponse } from "next/server";
import forge from "node-forge";
import { getSupabaseClient } from "@/core/api/supabase";
import { encryptPrivateKey } from "@/features/arca/services/arca-crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_cuit } = body;
    let { razon_social } = body;
    
    if (!company_cuit) {
      return NextResponse.json(
        { error: "El company_cuit es requerido." },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    if (!razon_social) {
      const { data: compProfile, error: profileErr } = await client.database
        .from("company_profile")
        .select("razon_social")
        .eq("cuit", company_cuit)
        .maybeSingle();
        
      if (!profileErr && compProfile?.razon_social) {
        razon_social = compProfile.razon_social;
      }
    }
    
    if (!razon_social) {
      return NextResponse.json(
        { error: "La razon_social es requerida y no se pudo recuperar automáticamente del perfil." },
        { status: 400 }
      );
    }
    
    // 1. Generate RSA 2048 Key Pair natively in JS using node-forge
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    
    // 2. Create Certificate Signing Request (CSR) with AFIP metadata requirements
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject([
      { name: "commonName", value: `ERP Nodo Sur - CUIT ${company_cuit}` },
      { name: "organizationName", value: razon_social },
      { name: "countryName", value: "AR" }
    ]);
    
    // Sign the CSR request with the private key
    csr.sign(keys.privateKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);
    
    // 3. Encrypt the private key securely using AES-256-GCM
    const encryptedPrivateKey = encryptPrivateKey(privateKeyPem);
    
    // 4. Save/Upsert into arca_credentials database table using InsForge SDK
    
    // Check if credentials already exist for this CUIT
    const { data: existing, error: checkErr } = await client.database
      .from("arca_credentials")
      .select("*")
      .eq("company_cuit", company_cuit)
      .maybeSingle();
      
    if (checkErr) throw checkErr;
    
    if (existing) {
      // Update
      const { error: updateErr } = await client.database
        .from("arca_credentials")
        .update({
          private_key: encryptedPrivateKey,
          updated_at: new Date().toISOString(),
        })
        .eq("company_cuit", company_cuit);
        
      if (updateErr) throw updateErr;
    } else {
      // Insert (requires array of objects per InsForge contract)
      const { error: insertErr } = await client.database
        .from("arca_credentials")
        .insert([
          {
            company_cuit: company_cuit,
            private_key: encryptedPrivateKey,
            certificate: "", // Initially empty until Step 4
            punto_venta: 1, // Default point of sale
            environment: "simulation", // Default environment
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]);
        
      if (insertErr) throw insertErr;
    }
    
    return NextResponse.json({
      success: true,
      csr: csrPem,
      company_cuit
    });
    
  } catch (err: any) {
    console.error("Error in generate-csr route:", err);
    return NextResponse.json(
      { error: err.message || "Falla crítica al generar el CSR de AFIP." },
      { status: 500 }
    );
  }
}
