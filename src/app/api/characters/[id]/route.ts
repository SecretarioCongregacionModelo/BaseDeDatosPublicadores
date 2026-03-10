import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// FIX: In Next.js 15, params is now a Promise and must be awaited
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise to get the actual values
    const { id } = await params;
    console.log(`[DELETE /api/characters/${id}] Deleting report`);

    await db.monthlyReport.delete({
      where: { id }
    });

    console.log(`[DELETE /api/characters/${id}] Report deleted successfully`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      {
        error: 'Error deleting character',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
