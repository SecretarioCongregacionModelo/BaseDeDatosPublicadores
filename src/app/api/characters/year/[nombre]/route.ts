import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// FIX: In Next.js 15, params is now a Promise and must be awaited
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ nombre: string }> }
) {
  try {
    // Await the params Promise to get the actual values
    const { nombre } = await params;
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');

    console.log(`[DELETE /api/characters/year/${nombre}] Deleting all reports for year: ${year}`);

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const result = await db.monthlyReport.deleteMany({
      where: {
        publisher: {
          name: decodeURIComponent(nombre)
        },
        year: parseInt(year)
      }
    });

    console.log(`[DELETE /api/characters/year/${nombre}] Deleted ${result.count} reports`);

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('Error deleting character from year:', error);
    return NextResponse.json(
      {
        error: 'Error deleting character from year',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
