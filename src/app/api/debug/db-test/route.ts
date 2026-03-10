import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Diagnostic endpoint to test database connectivity and write operations
 * GET /api/debug/db-test - Tests read operations
 * POST /api/debug/db-test - Tests write operations (create, update, delete)
 * 
 * This endpoint is useful for debugging Vercel deployment issues.
 * It returns detailed error information that helps identify the root cause.
 */

export async function GET(request: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        steps: []
    };

    try {
        // Step 1: Test basic connection
        results.steps.push({ step: 'test_connection', status: 'running' });

        const publisherCount = await db.publisher.count();
        const reportCount = await db.monthlyReport.count();

        results.steps[0].status = 'success';
        results.steps[0].publishers = publisherCount;
        results.steps[0].monthlyReports = reportCount;

        // Step 2: Test read with include
        results.steps.push({ step: 'test_read_with_include', status: 'running' });

        const sampleReport = await db.monthlyReport.findFirst({
            include: { publisher: true }
        });

        results.steps[1].status = 'success';
        results.steps[1].sampleReport = sampleReport ? {
            id: sampleReport.id,
            publisherName: sampleReport.publisher.name,
            year: sampleReport.year,
            month: sampleReport.month
        } : null;

        // Step 3: Check Prisma client info
        results.steps.push({ step: 'prisma_info', status: 'running' });

        results.steps[2].status = 'success';
        results.steps[2].prismaVersion = require('@prisma/client').Prisma.prismaVersion;

        return NextResponse.json({
            success: true,
            message: 'All read tests passed',
            ...results
        });

    } catch (error) {
        const lastStep = results.steps[results.steps.length - 1];
        if (lastStep) {
            lastStep.status = 'failed';
            lastStep.error = error instanceof Error ? error.message : String(error);
            lastStep.errorType = error?.constructor?.name || 'Unknown';
            lastStep.stack = error instanceof Error ? error.stack : undefined;
        }

        return NextResponse.json({
            success: false,
            message: 'Read test failed',
            ...results
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        steps: []
    };

    let testPublisherId: string | null = null;
    let testReportId: string | null = null;

    try {
        // Step 1: Create a test publisher
        results.steps.push({ step: 'create_test_publisher', status: 'running' });

        const testPublisher = await db.publisher.create({
            data: {
                name: `__TEST__${Date.now()}`,
                birthDate: new Date('2000-01-01'),
                gender: 'MASCULINO',
            }
        });

        testPublisherId = testPublisher.id;
        results.steps[0].status = 'success';
        results.steps[0].publisherId = testPublisher.id;
        results.steps[0].publisherName = testPublisher.name;

        // Step 2: Create a test monthly report
        results.steps.push({ step: 'create_test_report', status: 'running' });

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const testReport = await db.monthlyReport.create({
            data: {
                publisherId: testPublisher.id,
                year: currentYear,
                month: currentMonth,
                isBaptized: false,
                privilege: 'PUBLICADOR',
                participated: true,
                hours: 10,
                bibleStudies: 1,
                isPrecursor: false,
            }
        });

        testReportId = testReport.id;
        results.steps[1].status = 'success';
        results.steps[1].reportId = testReport.id;

        // Step 3: Update the test report
        results.steps.push({ step: 'update_test_report', status: 'running' });

        const updatedReport = await db.monthlyReport.update({
            where: { id: testReport.id },
            data: { hours: 15 }
        });

        results.steps[2].status = 'success';
        results.steps[2].updatedHours = updatedReport.hours;

        // Step 4: Delete the test report
        results.steps.push({ step: 'delete_test_report', status: 'running' });

        await db.monthlyReport.delete({
            where: { id: testReport.id }
        });

        testReportId = null;
        results.steps[3].status = 'success';

        // Step 5: Delete the test publisher
        results.steps.push({ step: 'delete_test_publisher', status: 'running' });

        await db.publisher.delete({
            where: { id: testPublisher.id }
        });

        testPublisherId = null;
        results.steps[4].status = 'success';

        return NextResponse.json({
            success: true,
            message: 'All write tests passed - database is fully functional',
            ...results
        });

    } catch (error) {
        const lastStep = results.steps[results.steps.length - 1];
        if (lastStep) {
            lastStep.status = 'failed';
            lastStep.error = error instanceof Error ? error.message : String(error);
            lastStep.errorType = error?.constructor?.name || 'Unknown';
            lastStep.stack = error instanceof Error ? error.stack : undefined;
        }

        // Cleanup: Try to delete any test data that was created
        if (testReportId) {
            try {
                await db.monthlyReport.delete({ where: { id: testReportId } });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        if (testPublisherId) {
            try {
                await db.publisher.delete({ where: { id: testPublisherId } });
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        return NextResponse.json({
            success: false,
            message: 'Write test failed',
            ...results
        }, { status: 500 });
    }
}
