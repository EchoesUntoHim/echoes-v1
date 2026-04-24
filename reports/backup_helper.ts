import fs from 'fs';
import path from 'path';

console.log('Starting backup procedure for v1.8.0...');

const backupsDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

const manifest = {
  version: '1.8.0',
  timestamp: new Date().toISOString()
};

fs.writeFileSync(path.join(backupsDir, 'v1.8.0_manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Backup manifest created at /backups/v1.8.0_manifest.json');
