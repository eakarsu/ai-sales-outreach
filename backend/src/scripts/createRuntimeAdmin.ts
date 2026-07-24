import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('Refusing administrator provisioning without explicit acknowledgement');
  }
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  const firstName = String(process.env.ADMIN_FIRST_NAME || 'Runtime').trim();
  const lastName = String(process.env.ADMIN_LAST_NAME || 'Acceptance').trim();
  if (!email || password.length < 12) throw new Error('ADMIN_EMAIL and a strong ADMIN_PASSWORD are required');
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users(email,password_hash,first_name,last_name,role,email_verified)
     VALUES($1,$2,$3,$4,'admin',TRUE)
     ON CONFLICT(email) DO UPDATE SET
       password_hash=EXCLUDED.password_hash,first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name,role='admin',email_verified=TRUE,updated_at=NOW()`,
    [email, passwordHash, firstName, lastName],
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => pool.end());
