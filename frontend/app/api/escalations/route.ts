import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), '..', 'backend', 'src', 'escalation_api.py');
    const { stdout } = await execPromise(`python "${scriptPath}" --list`);
    const escalations = JSON.parse(stdout);
    return NextResponse.json(escalations);
  } catch (error) {
    console.error('Failed to get escalations:', error);
    return NextResponse.json({ error: 'Failed to fetch escalations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { escalation_id } = await request.json();
    if (!escalation_id) {
      return NextResponse.json({ error: 'Missing escalation_id' }, { status: 400 });
    }
    
    const scriptPath = path.join(process.cwd(), '..', 'backend', 'src', 'escalation_api.py');
    const { stdout } = await execPromise(`python "${scriptPath}" --resolve "${escalation_id}"`);
    const result = JSON.parse(stdout);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to resolve escalation:', error);
    return NextResponse.json({ error: 'Failed to resolve escalation' }, { status: 500 });
  }
}
