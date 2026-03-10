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
      { error: 'Error fetching characters', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Step-by-step logging for debugging Vercel issues
  let step = 'init';

  try {
    step = 'parsing_body';
    const body = await request.json();
    console.log('[POST /api/characters] Request body received:', JSON.stringify(body, null, 2));

    step = 'validating_required_fields';
    if (!body.nombre || !body.fechaNacimiento) {
      console.log('[POST /api/characters] Validation failed: missing nombre or fechaNacimiento');
      return NextResponse.json(
        { error: 'Name and BirthDate are required', step },
        { status: 400 }
      );
    }

    // 1. Find or Create Publisher
    step = 'finding_publisher';
    console.log(`[POST /api/characters] Looking for publisher: "${body.nombre}"`);

    let publisher = await db.publisher.findUnique({
      where: { name: body.nombre }
    });

    console.log(`[POST /api/characters] Publisher found:`, publisher ? `ID: ${publisher.id}` : 'null');

    if (!publisher) {
      step = 'creating_publisher';
      console.log(`[POST /api/characters] Creating new publisher with data:`, {
        name: body.nombre,
        birthDate: body.fechaNacimiento,
        gender: body.genero || 'MASCULINO',
        baptismDate: body.categoria3 || null
      });

      try {
        publisher = await db.publisher.create({
          data: {
            name: body.nombre,
            birthDate: new Date(body.fechaNacimiento),
            gender: body.genero || 'MASCULINO',
            baptismDate: body.categoria3 ? new Date(body.categoria3) : null,
          }
        });
        console.log(`[POST /api/characters] Publisher created successfully: ID ${publisher.id}`);
      } catch (createError) {
        console.error('[POST /api/characters] Error creating publisher:', createError);
        return NextResponse.json(
          {
            error: 'Error creating publisher',
            step,
            details: createError instanceof Error ? createError.message : String(createError),
            stack: createError instanceof Error ? createError.stack : undefined
          },
          { status: 500 }
        );
      }
    } else {
      // Optional: Update static info if changed (User might have corrected a birthdate)
      step = 'updating_publisher';
      console.log(`[POST /api/characters] Updating existing publisher: ID ${publisher.id}`);

      try {
        publisher = await db.publisher.update({
          where: { id: publisher.id },
          data: {
            birthDate: new Date(body.fechaNacimiento),
            gender: body.genero,
            baptismDate: body.categoria3 ? new Date(body.categoria3) : publisher.baptismDate,
          }
        });
        console.log(`[POST /api/characters] Publisher updated successfully`);
      } catch (updateError) {
        console.error('[POST /api/characters] Error updating publisher:', updateError);
        return NextResponse.json(
          {
            error: 'Error updating publisher',
            step,
            details: updateError instanceof Error ? updateError.message : String(updateError),
            stack: updateError instanceof Error ? updateError.stack : undefined
          },
          { status: 500 }
        );
      }
    }

    // 2. Map incoming categories to new schema Enums/Values
    step = 'mapping_categories';
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
    step = 'finding_report';
    console.log(`[POST /api/characters] Looking for existing report: publisherId=${publisher.id}, year=${body.year}, month=${body.month}`);

    const existingReport = await db.monthlyReport.findFirst({
      where: {
        publisherId: publisher.id,
        year: parseInt(body.year),
        month: parseInt(body.month)
      }
    });

    console.log(`[POST /api/characters] Existing report:`, existingReport ? `ID: ${existingReport.id}` : 'null');

    let report;
    if (existingReport) {
      step = 'updating_report';
      console.log(`[POST /api/characters] Updating existing report: ID ${existingReport.id}`);

      try {
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
        console.log(`[POST /api/characters] Report updated successfully`);
      } catch (updateReportError) {
        console.error('[POST /api/characters] Error updating report:', updateReportError);
        return NextResponse.json(
          {
            error: 'Error updating monthly report',
            step,
            details: updateReportError instanceof Error ? updateReportError.message : String(updateReportError),
            stack: updateReportError instanceof Error ? updateReportError.stack : undefined
          },
          { status: 500 }
        );
      }
    } else {
      step = 'creating_report';
      console.log(`[POST /api/characters] Creating new report with data:`, {
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
      });

      try {
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
        console.log(`[POST /api/characters] Report created successfully: ID ${report.id}`);
      } catch (createReportError) {
        console.error('[POST /api/characters] Error creating report:', createReportError);
        return NextResponse.json(
          {
            error: 'Error creating monthly report',
            step,
            details: createReportError instanceof Error ? createReportError.message : String(createReportError),
            stack: createReportError instanceof Error ? createReportError.stack : undefined
          },
          { status: 500 }
        );
      }
    }

    step = 'complete';
    console.log(`[POST /api/characters] Request completed successfully`);
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error(`[POST /api/characters] Unexpected error at step "${step}":`, error);
    return NextResponse.json(
      {
        error: 'Error creating character',
        step,
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name || 'Unknown'
      },
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
