import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { nombre: string } }
) {
  try {
    const { nombre } = params;
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const characters = await db.monthlyReport.findMany({
      where: {
        publisher: {
          name: decodeURIComponent(nombre)
        },
        year: parseInt(year)
      },
      include: {
        publisher: true
      },
      orderBy: { month: 'asc' }
    });

    const total = characters.reduce((sum, char) => {
      return sum + (char.hours || 0);
    }, 0);

    // Map to frontend structure
    const mappedCharacters = characters.map(char => ({
      id: char.id,
      month: char.month,
      year: char.year,
      categoria2: char.isBaptized ? 'SI' : 'NO',
      categoria3: char.publisher.baptismDate,
      categoria12: char.hours,
      categoria9: char.participated ? 'SI' : 'NO',
      categoria11: char.isPrecursor ? 'SI' : 'NO',
      categoria10: char.bibleStudies,
      categoria7: char.hope === 'OTRAS OVEJAS' ? 'OPCION7.1' : char.hope === 'UNGIDO' ? 'OPCION7.2' : 'NO APLICA',
      categoria8: char.privilege === 'ANCIANO' ? 'OPCION8.3' : char.privilege === 'SIERVO_MINISTERIAL' ? 'OPCION8.2' : char.privilege === 'MISIONERO' ? 'OPCION8.4' : 'OPCION8.1',
      categoria13: char.group,
      edad: 0, // Not vital for summary view, calculated in frontend if needed or simpler here
      genero: char.publisher.gender,
      nombre: char.publisher.name
    }));

    return NextResponse.json({
      data: mappedCharacters,
      total
    });
  } catch (error) {
    console.error('Error fetching character summary:', error);
    return NextResponse.json(
      { error: 'Error fetching character summary' },
      { status: 500 }
    );
  }
}
