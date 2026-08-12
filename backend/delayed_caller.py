import time
import sys
import argparse
import subprocess
import os

def main():
    parser = argparse.ArgumentParser(description="Wait and then trigger an outbound call")
    parser.add_argument("--phone", required=True, help="Phone number to call")
    parser.add_argument("--delay", type=int, required=True, help="Delay in minutes")
    parser.add_argument("--attempt", type=int, default=1, help="Attempt number for the call")
    args = parser.parse_args()

    print(f"Waiting for {args.delay} minutes before calling {args.phone} (Attempt {args.attempt})...")
    # Convert minutes to seconds
    time.sleep(args.delay * 60)
    
    # Launch trigger_call.py
    print(f"Time's up! Launching trigger_call.py for {args.phone}...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    trigger_script = os.path.join(script_dir, "trigger_call.py")
    
    # We use subprocess.Popen to launch it and exit.
    subprocess.Popen(
        [sys.executable, trigger_script, "--phone", args.phone, "--attempt", str(args.attempt)],
        cwd=script_dir
    )

if __name__ == "__main__":
    main()
