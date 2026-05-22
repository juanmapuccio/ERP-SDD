const fs = require('fs');
const path = require('path');

async function run() {
  console.log('--- Iniciando generador de script de migración SQL ---');

  // 1. Leer credenciales de InsForge
  const projectJsonPath = path.join(__dirname, '../.insforge/project.json');
  if (!fs.existsSync(projectJsonPath)) {
    console.error('Error: No se encontró .insforge/project.json');
    process.exit(1);
  }

  const projectConfig = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
  const { api_key, oss_host } = projectConfig;

  // 2. Tablas a migrar en orden de dependencias FK (primero marcas, repuestos, luego artículos, etc.)
  const tables = [
    'marca',
    'auto_marca',
    'auto_modelo',
    'auto_version',
    'familia_repuesto',
    'articulo',
    'company_profile',
    'customers',
    'caja_sesion',
    'customer_credit_accounts',
    'accounting_accounts',
    'arca_credentials'
  ];

  let sqlOutput = `-- SCRIPT DE MIGRACIÓN DE DATOS DE INSFORGE A SUPABASE\n`;
  sqlOutput += `-- Generado automáticamente el: ${new Date().toISOString()}\n\n`;
  sqlOutput += `BEGIN;\n\n`;

  // Deshabilitar triggers temporalmente para evitar fallas FK o RLS restrictivas durante la inyección
  sqlOutput += `-- Deshabilitar triggers\n`;
  for (const table of tables) {
    sqlOutput += `ALTER TABLE public.${table} DISABLE TRIGGER ALL;\n`;
  }
  sqlOutput += `\n`;

  for (const tableName of tables) {
    console.log(`Descargando datos de tabla: ${tableName}...`);
    try {
      const url = `${oss_host}/api/database/records/${tableName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'apikey': api_key
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ No se pudo obtener registros para la tabla ${tableName}: ${response.statusText}`);
        continue;
      }

      const records = await response.json();
      if (!Array.isArray(records) || records.length === 0) {
        console.log(` - Tabla ${tableName} vacía. Saltando.`);
        continue;
      }

      console.log(` - Descargados ${records.length} registros para ${tableName}. Generando SQL...`);
      sqlOutput += `-- Datos para tabla public.${tableName} (${records.length} registros)\n`;

      // Obtener columnas de las llaves del primer registro
      const columns = Object.keys(records[0]);

      for (const record of records) {
        const valuesSql = columns.map(col => {
          const val = record[col];
          if (val === null || val === undefined) {
            return 'NULL';
          }
          if (typeof val === 'object') {
            // Campos JSON/JSONB u objetos
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          }
          if (typeof val === 'string') {
            return `'${val.replace(/'/g, "''")}'`;
          }
          if (typeof val === 'boolean') {
            return val ? 'TRUE' : 'FALSE';
          }
          return val; // Números u otros tipos nativos
        });

        sqlOutput += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${valuesSql.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      sqlOutput += `\n`;

    } catch (err) {
      console.error(`❌ Error procesando tabla ${tableName}:`, err.message);
    }
  }

  // Volver a habilitar triggers
  sqlOutput += `-- Habilitar triggers nuevamente\n`;
  for (const table of tables) {
    sqlOutput += `ALTER TABLE public.${table} ENABLE TRIGGER ALL;\n`;
  }
  sqlOutput += `\n`;
  sqlOutput += `COMMIT;\n`;

  const outputPath = path.join(__dirname, 'migrate_data.sql');
  fs.writeFileSync(outputPath, sqlOutput, 'utf8');
  console.log(`\n✅ ¡Script SQL generado con éxito en: ${outputPath}!`);
}

run();
