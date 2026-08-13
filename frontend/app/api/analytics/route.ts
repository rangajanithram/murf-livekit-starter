import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), '..', 'backend', 'src', 'analytics_api.py');
    const { stdout } = await execPromise(`python "${scriptPath}" --list`);
    const analytics = JSON.parse(stdout);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
