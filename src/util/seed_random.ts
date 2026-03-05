
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const YEARS = [2011, 2012, 2013];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const GROUPS = ["LAS CASCADAS", "LAS HADAS", "LAS UVAS", "SALON DEL REINO"];

const NUM_PUBLISHERS = 10;

async function main() {
    console.log('🌱 Starting seeding process for CASO 6 (Prueba)...');

    // Generate 10 Random Publishers
    for (let i = 1; i <= NUM_PUBLISHERS; i++) {
        const name = `Publicador Ejemplo ${i}`;
        const gender = Math.random() > 0.5 ? 'MASCULINO' : 'FEMENINO';

        // Baptism logic:
        // Determine a "Baptism Year" randomly between 2000 and 2015
        // If baptism year <= current year in loop, they are baptized.
        const baptismYear = Math.floor(Math.random() * (2015 - 2000 + 1)) + 2000;
        const baptismMonth = Math.floor(Math.random() * 12) + 1;
        const baptismDate = `${baptismYear}-${baptismMonth.toString().padStart(2, '0')}-15`;

        console.log(`Creating publisher: ${name} (Baptism Year: ${baptismYear})`);

        // Create Publisher Static Record
        const publisher = await prisma.publisher.create({
            data: {
                name: name,
                birthDate: new Date('1985-01-01'), // Fixed birthdate for simplicity
                gender: gender,
                baptismDate: new Date(baptismDate), // We store it, but monthly report status depends on current date
            }
        });

        // Create Monthly Reports for 2011, 2012, 2013
        for (const year of YEARS) {
            // Randomly assign a group for this year (can change between years)
            const groupForYear = GROUPS[Math.floor(Math.random() * GROUPS.length)];

            for (const month of MONTHS) {

                // Determine "Is Baptized" status for this month
                let isBaptized = false;
                if (year > baptismYear) {
                    isBaptized = true;
                } else if (year === baptismYear && month >= baptismMonth) {
                    isBaptized = true;
                }

                // Randomly determine participation
                // 90% chance to participate
                const participates = Math.random() < 0.9;

                // Randomly determine Pioneer status (only if participates)
                // 20% chance if participates
                const isPrecursor = participates && Math.random() < 0.2;

                // Bible Studies
                const studies = participates ? Math.floor(Math.random() * 6) : 0; // 0-5

                // Hours
                // User rule: "cambia las horas siempre menos de 100"
                let hours = 0;
                if (isPrecursor) {
                    hours = Math.floor(Math.random() * 99) + 1; // 1-99
                } else if (participates) {
                    // Non-pioneers also report hours usually, but maybe fewer?
                    // User said "caso contrario no salen las horas" (visual hidden), but can exist in DB?
                    // Or "trata de hacer este ejercicio lo mas general posible".
                    // I'll give them variable hours too, 1-30.
                    hours = Math.floor(Math.random() * 30) + 1;
                }

                await prisma.monthlyReport.create({
                    data: {
                        publisherId: publisher.id,
                        year: year,
                        month: month,
                        group: groupForYear,

                        // Status
                        isBaptized: isBaptized,
                        hope: 'OTRAS OVEJAS', // Default as requested
                        privilege: gender === 'MASCULINO' && Math.random() < 0.3 ? 'ANCIANO' : 'PUBLICADOR', // Random privilege for men

                        // Stats
                        participated: participates ? true : false,
                        isPrecursor: isPrecursor ? true : false,
                        bibleStudies: studies,
                        hours: hours,

                        // For boolean category 'SI'/'NO' equivalents in UI, the DB uses Booleans/Ints/Floats?
                        // Wait, looking at Schema, it uses Booleans/Ints.
                        // BUT looking at `CharacterDatabase.tsx`, it sends `categoria9: 'SI'` etc.
                        // I need to check how the API `/api/characters/route.ts` handles the POST body vs DB schema.
                        // If the schema implementation in `route.ts` translates 'SI' to true, then the DB stores boolean.
                        // Schema has `participated Boolean`.
                        // So my seed script should insert Booleans.
                        // BUT, `CharacterDatabase.tsx` reads `categoria9` as 'SI'/'NO'.
                        // This means the API GET route MUST translate DB boolean to 'SI'/'NO'.
                        // I should double check `route.ts` to be sure how to insert directly into DB via Prisma.
                        // Actually, if I use Prisma client directly, I follow the schema types.
                        // So Boolean is correct. The API likely transforms it.
                    }
                });
            }
        }
    }

    console.log('✅ Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
