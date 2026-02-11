import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  // 优先级：命令行参数 > VERCEL 环境变量 > NODE_ENV
  const args = process.argv.slice(2);
  const forceEnv = args.find(arg => arg.startsWith('--env='))?.split('=')[1];
  
  const isProduction = forceEnv === 'production' || 
                       process.env.VERCEL === '1' || 
                       process.env.NODE_ENV === 'production';
                       
  const prismaDir = path.join(__dirname, '..', 'prisma');
  
  console.log(`[Prisma Setup] Targeted Environment: ${isProduction ? 'PRODUCTION (PostgreSQL)' : 'DEVELOPMENT (SQLite)'}`);

  try {
    if (isProduction) {
      console.log('Using PostgreSQL schema for production...');
      fs.copyFileSync(
        path.join(prismaDir, 'schema.postgresql.prisma'),
        path.join(prismaDir, 'schema.prisma')
      );
    } else {
      console.log('Using SQLite schema for development...');
      fs.copyFileSync(
        path.join(prismaDir, 'schema.sqlite.prisma'),
        path.join(prismaDir, 'schema.prisma')
      );
    }

    console.log('Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error during postinstall:', error);
    // Don't exit with error to prevent breaking build if something minor goes wrong, 
    // but in a real case we might want to exit(1)
  }
}

main();
