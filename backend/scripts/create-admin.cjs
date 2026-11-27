require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { isEmail } = require('class-validator');
const readline = require('node:readline/promises');

async function createAdmin(email, password) {
  email = String(email || '').trim().toLowerCase();
  if (!isEmail(email)) throw new Error('Email khong hop le.');
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)
    throw new Error('Mat khau can it nhat 8 ky tu va khong vuot 72 byte UTF-8.');
  const db = new PrismaClient();
  try {
    if (await db.user.findUnique({ where: { email } }))
      throw new Error('Email da ton tai. Khong thay doi tai khoan hoac mat khau cu.');
    return await db.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN', onboardingCompleted: true },
      select: { id: true, email: true, role: true },
    });
  } finally {
    await db.$disconnect();
  }
}

function passwordPrompt(label) {
  if (!process.stdin.isTTY) throw new Error('Hay chay lenh trong terminal tuong tac.');
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\u0003') { cleanup(); reject(new Error('Da huy.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(value); return; }
        if (char === '\u007f' || char === '\b') {
          if (value) { value = [...value].slice(0, -1).join(''); process.stdout.write('\b \b'); }
        } else if (char >= ' ') { value += char; process.stdout.write('*'); }
      }
    };
    process.stdout.write(label);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function main() {
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  let email;
  try { email = await input.question('Email Admin moi: '); }
  finally { input.close(); }
  const password = await passwordPrompt('Mat khau moi (toi thieu 8 ky tu): ');
  const confirmation = await passwordPrompt('Nhap lai mat khau: ');
  if (password !== confirmation) throw new Error('Hai mat khau khong trung nhau.');
  const admin = await createAdmin(email, password);
  console.log(`Da tao Admin: ${admin.email} (ID ${admin.id}). Dang nhap tai http://localhost:4200/login`);
}

module.exports = { createAdmin };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
