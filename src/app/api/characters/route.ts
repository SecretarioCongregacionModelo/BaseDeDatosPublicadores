import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const nombre = searchParams.get('nombre');

    let whereClause: any = {};

    if (year) {
      whereClause.year = parseInt(year);
    }

    if (month) {
      whereClause.month = parseInt(month);
    }

    if (nombre) {
      whereClause.publisher = {
        name: {
          contains: nombre // Basic search
        }
      };
    }

    // Get Reports with Publisher data
    const reports = await db.monthlyReport.findMany({
      where: whereClause,
      include: {
        publisher: true
      },
      orderBy: [
        { publisher: { name: 'asc' } },
        { month: 'asc' }
      ]
    });

    // Map to flat structure for frontend compatibility (gradual migration)
    const flattened = reports.map(r => ({
      id: r.id,
      publisherId: r.publisherId,
      nombre: r.publisher.name,
      fechaNacimiento: r.publisher.birthDate,
      genero: r.publisher.gender,
      edad: calculateAge(r.publisher.birthDate),

      // Mapped categories
      categoria2: r.isBaptized ? 'SI' : 'NO',
      categoria3: r.publisher.baptismDate,
      categoria7: r.hope === 'OTRAS OVEJAS' ? 'OPCION7.1' : r.hope === 'UNGIDO' ? 'OPCION7.2' : 'NO APLICA',
      categoria8: mapPrivilegeToCategory(r.privilege),
      categoria13: r.group,
      categoria9: r.participated ? 'SI' : 'NO',
      categoria10: r.bibleStudies?.toString() || '',
      categoria11: r.isPrecursor ? 'SI' : 'NO', // Simplification, handled better in frontend logic
      categoria12: r.hours,

      year: r.year,
      month: r.month,

      // New fields usage
      isBaptized: r.isBaptized,
      privilege: r.privilege,
      group: r.group,
      participated: r.participated,
      hours: r.hours
    }));

    return NextResponse.json(flattened);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { error: 'Error fetching characters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.nombre || !body.fechaNacimiento) {
      return NextResponse.json(
        { error: 'Name and BirthDate are required' },
        { status: 400 }
      );
    }

    // 1. Find or Create Publisher
    // We use "upsert" logic manually because we might update static info
    let publisher = await db.publisher.findUnique({
      where: { name: body.nombre }
    });

    if (!publisher) {
      publisher = await db.publisher.create({
        data: {
          name: body.nombre,
          birthDate: new Date(body.fechaNacimiento),
          gender: body.genero || 'MASCULINO',
          baptismDate: body.categoria3 ? new Date(body.categoria3) : null,
        }
      });
    } else {
      // Optional: Update static info if changed (User might have corrected a birthdate)
      publisher = await db.publisher.update({
        where: { id: publisher.id },
        data: {
          birthDate: new Date(body.fechaNacimiento),
          gender: body.genero,
          baptismDate: body.categoria3 ? new Date(body.categoria3) : publisher.baptismDate,
        }
      });
    }

    // 2. Map incoming categories to new schema Enums/Values
    const isBaptized = body.categoria2 === 'SI';
    const hope = body.categoria7 === 'OPCION7.1' ? 'OTRAS OVEJAS' :
      body.categoria7 === 'OPCION7.2' ? 'UNGIDO' : null;

    // Privilege Mapping
    let privilege = 'PUBLICADOR';
    if (body.categoria8 === 'OPCION8.2') privilege = 'SIERVO_MINISTERIAL';
    if (body.categoria8 === 'OPCION8.3') privilege = 'ANCIANO';
    if (body.categoria8 === 'OPCION8.4') privilege = 'MISIONERO';

    const group = body.categoria13;
    const participated = body.categoria9 === 'SI';
    const isPrecursor = body.categoria11 === 'SI';
    const hours = parseFloat(body.categoria12) || 0;
    const bibleStudies = body.categoria10 ? parseInt(body.categoria10) : 0;

    // 3. Upsert Monthly Report
    // We search for a report for this publisher+year+month
    const startOfMonth = new Date(body.year, body.month - 1, 1);

    // Check if report exists
    const existingReport = await db.monthlyReport.findFirst({
      where: {
        publisherId: publisher.id,
        year: parseInt(body.year),
        month: parseInt(body.month)
      }
    });

    let report;
    if (existingReport) {
      report = await db.monthlyReport.update({
        where: { id: existingReport.id },
        data: {
          isBaptized,
          hope,
          privilege,
          group,
          participated,
          bibleStudies,
          isPrecursor,
          hours
        }
      });
    } else {
      report = await db.monthlyReport.create({
        data: {
          publisherId: publisher.id,
          year: parseInt(body.year),
          month: parseInt(body.month),
          isBaptized,
          hope,
          privilege,
          group,
          participated,
          bibleStudies,
          isPrecursor,
          hours
        }
      });
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Error creating character' },
      { status: 500 }
    );
  }
}

// Helpers
function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function mapPrivilegeToCategory(privilege: string) {
  switch (privilege) {
    case 'SIERVO_MINISTERIAL': return 'OPCION8.2';
    case 'ANCIANO': return 'OPCION8.3';
    case 'MISIONERO': return 'OPCION8.4';
    default: return 'OPCION8.1';
  }
}
