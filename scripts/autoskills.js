const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Caminos de origen y destino
const localSkillsDir = path.join(__dirname, '..', '.agents', 'skills');
const globalSkillsDir = path.join(process.env.USERPROFILE || process.env.HOME, '.agents', 'skills');

console.log('\n\x1b[35m[AutoSkills]\x1b[0m Iniciando sincronización de Skills del ERP...');

if (!fs.existsSync(localSkillsDir)) {
  console.log('\x1b[33m[Warning]\x1b[0m No se encontró la carpeta local .agents/skills. Creándola...');
  fs.mkdirSync(localSkillsDir, { recursive: true });
}

try {
  // Asegurar que la carpeta global exista
  fs.mkdirSync(globalSkillsDir, { recursive: true });

  // Leer las carpetas locales de skills
  const localSkills = fs.readdirSync(localSkillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (localSkills.length === 0) {
    console.log('\x1b[36m[Info]\x1b[0m No hay skills locales para sincronizar en .agents/skills/');
  } else {
    localSkills.forEach(skillName => {
      const srcDir = path.join(localSkillsDir, skillName);
      const destDir = path.join(globalSkillsDir, skillName);

      fs.mkdirSync(destDir, { recursive: true });

      // Copiar todos los archivos y subdirectorios de la skill recursivamente
      if (typeof fs.cpSync === 'function') {
        fs.cpSync(srcDir, destDir, { recursive: true });
      } else {
        const copyRecursive = (src, dest) => {
          const stats = fs.statSync(src);
          if (stats.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(child => {
              copyRecursive(path.join(src, child), path.join(dest, child));
            });
          } else {
            fs.copyFileSync(src, dest);
          }
        };
        copyRecursive(srcDir, destDir);
      }

      console.log(`\x1b[32m✅ Sincronizada:\x1b[0m ${skillName} -> ${destDir}`);
    });
  }

  // Refrescar el registro de Gentle AI
  console.log('\n\x1b[35m[AutoSkills]\x1b[0m Actualizando skill-registry en Gentle AI...');
  
  // Ejecutar el comando oficial de Gentle AI para forzar la actualización
  try {
    execSync('gentle-ai skill-registry refresh --force', { stdio: 'inherit' });
    console.log('\x1b[32m✨ ¡Registro de Skills actualizado y cargado en el MCP de Engram con éxito!\x1b[0m\n');
  } catch (err) {
    console.log('\x1b[33m⚠️ No se pudo ejecutar gentle-ai de forma global. Sincronización local completada de todas formas.\x1b[0m\n');
  }

} catch (error) {
  console.error('\x1b[31m❌ Error durante la ejecución de AutoSkills:\x1b[0m', error.message);
}
