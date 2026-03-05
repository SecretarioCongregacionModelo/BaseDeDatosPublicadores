import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
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

    await db.monthlyReport.deleteMany({
      where: {
        publisher: {
          name: decodeURIComponent(nombre)
        },
        year: parseInt(year)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character from year:', error);
    return NextResponse.json(
      { error: 'Error deleting character from year' },
      { status: 500 }
    );
  }
}
