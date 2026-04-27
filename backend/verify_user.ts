import prisma from './src/prismaClient';

async function main() {
  const email = 'teststudent@mcstays.com';
  const user = await prisma.user.update({
    where: { email },
    data: { verified: true }
  });
  console.log('User verified:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
