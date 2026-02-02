import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';

const schema = z.object({
    url: z.string().url().includes('linkedin.com/in/'),
});

// Helper to run python script
function runPythonScraper(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'linkedin_engine.py');
        const pythonProcess = spawn('python3', [scriptPath, url], {
            env: { ...process.env }, // Pass environment variables for LINKEDIN_EMAIL/PASSWORD
        });

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}: ${errorString}`));
                return;
            }
            try {
                // Find JSON in output (in case of extra logs)
                const jsonMatch = dataString.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.error('Python Script STDOUT:', dataString);
                    console.error('Python Script STDERR:', errorString);
                    reject(new Error('No JSON output from scraper - check server logs for details'));
                    return;
                }
                const result = JSON.parse(jsonMatch[0]);
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            } catch (e) {
                reject(new Error(`Failed to parse JSON: ${dataString}`));
            }
        });
    });
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validation = schema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid LinkedIn URL' }, { status: 400 });
        }

        const { url } = validation.data;

        // 1. Update user's LinkedIn URL
        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: { linkedin_url: url },
        });

        // 2. Run Python Scraper
        let profileData;
        try {
            profileData = await runPythonScraper(url);
        } catch (error: any) {
            console.error('Python Scraper Error:', error);
            return NextResponse.json({
                error: 'Scraping failed. Ensure LINKEDIN_EMAIL and LINKEDIN_PASSWORD are set in .env.local and that the account is not blocked.'
            }, { status: 500 });
        }

        if (!profileData) {
            return NextResponse.json({
                message: 'Could not extract details.',
                linkSaved: true
            }, { status: 200 });
        }

        // 3. Update User Profile
        const updates: any = {};
        if (profileData.headline && !user.target_role) {
            updates.target_role = profileData.headline;
        }

        if (Object.keys(updates).length > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: updates
            });
        }

        // 4. Insert Education
        if (profileData.education && profileData.education.length > 0) {
            for (const edu of profileData.education) {
                await prisma.education.create({
                    data: {
                        user_id: user.id,
                        institution: edu.school || 'Unknown School',
                        degree: edu.degree || 'Degree',
                        field: edu.field, // Python script might need update to extract field if available in object
                        start_date: edu.startYear ? new Date(edu.startYear) : undefined,
                        end_date: edu.endYear ? new Date(edu.endYear) : undefined,
                    }
                });
            }
        }

        // 5. Insert Experience
        if (profileData.experience && profileData.experience.length > 0) {
            for (const work of profileData.experience) {
                await prisma.workExperience.create({
                    data: {
                        user_id: user.id,
                        company: work.company || 'Unknown Company',
                        position: work.title || 'Role',
                        description: work.description,
                        start_date: work.startDate ? new Date(work.startDate) : undefined,
                        end_date: work.endDate ? new Date(work.endDate) : undefined,
                        is_current: !work.endDate
                    }
                });
            }
        }

        return NextResponse.json({ success: true, data: profileData });

    } catch (error) {
        console.error('LinkedIn API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
