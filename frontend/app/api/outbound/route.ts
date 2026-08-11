import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return new NextResponse('Phone number is required', { status: 400 });
    }

    // Since we are running in the frontend folder, we need to run the python script from the backend folder
    const backendDir = path.join(process.cwd(), '../backend');

    console.log(`Triggering outbound call to ${phone} from backend directory: ${backendDir}`);

    // Use uv to run the python script just like in the terminal
    try {
      const { stdout, stderr } = await execAsync(`uv run python trigger_call.py --phone ${phone}`, {
        cwd: backendDir,
      });
      console.log('Script stdout:', stdout);
      if (stderr) console.error('Script stderr:', stderr);
      return NextResponse.json({ success: true, message: 'Call initiated' });
    } catch (e: any) {
      console.error('Script executed with error:', e.message);
      // Even if it throws (e.g. non-zero exit code due to a warning), if the call was initiated, it's a success
      if (e.stdout && e.stdout.includes('Call initiated successfully')) {
        return NextResponse.json({ success: true, message: 'Call initiated with warnings' });
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to trigger call:', error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
