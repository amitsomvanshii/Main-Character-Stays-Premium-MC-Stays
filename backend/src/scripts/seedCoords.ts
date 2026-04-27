import prisma from '../prismaClient';
import "dotenv/config";


const CITY_COORDS = {
  'Bangalore': [12.9716, 77.5946],
  'Hyderabad': [17.3850, 78.4867],
  'Pune': [18.5204, 73.8567],
  'Mumbai': [19.0760, 72.8777],
  'Delhi NCR': [28.6139, 77.2090],
  'Gurgaon': [28.4595, 77.0266],
  'Noida': [28.5355, 77.3910],
  'Chennai': [13.0827, 80.2707],
  'Kolkata': [22.5726, 88.3639],
  'Ahmedabad': [23.0225, 72.5714],
  'Kochi': [9.9312, 76.2673],
  'Jaipur': [26.9124, 75.7873],
  'Chandigarh': [30.7333, 76.7794],
  'Indore': [22.7196, 75.8577],
  'Bhubaneswar': [20.2961, 85.8245],
  'Coimbatore': [11.0168, 76.9558],
  'Mysore': [12.2958, 76.6394],
  'Lucknow': [26.8467, 80.9462],
};

async function seedCoords() {
  console.log('--- Starting Geolocation Seeding ---');
  
  const pgs = await prisma.pg.findMany();
  let count = 0;

  for (const pg of pgs) {
    const cityName = pg.city as keyof typeof CITY_COORDS;
    const cityBase = CITY_COORDS[cityName] || [20.5937, 78.9629];
    
    // Add realistic variation
    const lat = cityBase[0] + (Math.random() - 0.5) * 0.1;
    const lng = cityBase[1] + (Math.random() - 0.5) * 0.1;

    await prisma.pg.update({
      where: { id: pg.id },
      data: {
        latitude: lat,
        longitude: lng
      }
    });
    count++;
  }

  console.log(`Successfully updated ${count} PGs with mock coordinates.`);
}

seedCoords()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
