const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'teststudent@mcstays.com' },
    data: { verified: true }
  });
  console.log('User verified:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
