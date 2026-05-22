import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/core/api/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_cuit, certificate, punto_venta } = body;
    
    if (!company_cuit || !certificate || !punto_venta) {
      return NextResponse.json(
        { error: "El company_cuit, certificate y punto_venta son requeridos." },
        { status: 400 }
      );
    }
    
    // Validate CUIT length and certificate basic header check
    if (company_cuit.length !== 11 || !/^\d+$/.test(company_cuit)) {
      return NextResponse.json(
        { error: "El formato de CUIT no es válido. Debe tener 11 dígitos numéricos." },
        { status: 400 }
      );
    }
    
    if (!certificate.includes("-----BEGIN CERTIFICATE-----") || !certificate.includes("-----END CERTIFICATE-----")) {
      return NextResponse.json(
        { error: "El formato del certificado no es válido. Debe ser PEM (.crt)." },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // Fetch if a credential slot exists (which should have the encrypted private key from Step 2)
    const { data: existing, error: checkErr } = await client.database
      .from("arca_credentials")
      .select("*")
      .eq("company_cuit", company_cuit)
      .maybeSingle();
      
    if (checkErr) throw checkErr;
    
    if (!existing) {
      return NextResponse.json(
        { error: "No se encontró un par de llaves privadas pendiente para este CUIT. Genere el CSR primero." },
        { status: 404 }
      );
    }
    
    // Update the existing record with the certificate, point of sale, and initialize environment to simulation
    const { error: updateErr } = await client.database
      .from("arca_credentials")
      .update({
        certificate: certificate,
        punto_venta: Number(punto_venta),
        environment: "simulation",
        updated_at: new Date().toISOString(),
      })
      .eq("company_cuit", company_cuit);
      
    if (updateErr) throw updateErr;
    
    return NextResponse.json({
      success: true,
      message: "Certificado subido y validado con éxito en el sistema.",
      company_cuit,
      environment: "simulation"
    });
    
  } catch (err: any) {
    console.error("Error in upload-certificate route:", err);
    return NextResponse.json(
      { error: err.message || "Falla crítica al subir el certificado fiscal." },
      { status: 500 }
    );
  }
}
