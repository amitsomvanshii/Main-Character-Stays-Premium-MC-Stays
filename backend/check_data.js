const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const payCount = await prisma.payment.count();
    const leadCount = await prisma.lead.count();
    console.log('Payments:', payCount);
    console.log('Leads:', leadCount);
    
    if (payCount > 0) {
      const latest = await prisma.payment.findFirst({ orderBy: { confirmedAt: 'desc' } });
      console.log('Latest Payment:', latest);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
