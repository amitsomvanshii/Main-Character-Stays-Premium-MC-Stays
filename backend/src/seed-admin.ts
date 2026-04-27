import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'amitsomvanshi63@gmail.com';
  const name = 'Root Admin';
  const password = 'AdminPassword123'; // User can change this later
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', verified: true }
    });
    console.log(`Admin user ${email} updated and verified.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        verified: true
      }
    });
    console.log(`Admin user ${email} created with password: ${password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
