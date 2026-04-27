import prisma from '../prismaClient';

async function clearDatabase() {
  console.log('🗑️ Starting database cleanup...');
  
  try {
    // Delete in order to satisfy foreign key constraints
    await prisma.review.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.bed.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.pg.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Successfully cleared all Users, Owners, PGs, and Bookings.');
    console.log('🚀 You can now start fresh with the new OTP system!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    // We don't disconnect here because it's a shared instance in this project's setup
    // but for a one-off script it's usually fine. 
    // However, the prismaClient.ts doesn't export the pool, so we just exit.
    process.exit(0);
  }
}

clearDatabase();
