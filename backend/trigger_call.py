import asyncio
import os
import sys
import argparse
import subprocess
from dotenv import load_dotenv
from livekit import api
from livekit.protocol import agent_dispatch as ad_proto

load_dotenv(".env.local")

async def main():
    parser = argparse.ArgumentParser(description="Trigger an outbound call via LiveKit SIP")
    parser.add_argument("--phone", required=True, help="Phone number to call (e.g. +919353143053)")
    parser.add_argument("--attempt", type=int, default=1, help="Attempt number for the call")
    args = parser.parse_args()

    # Load credentials
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    trunk_id = os.getenv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID")

    if not all([url, api_key, api_secret, trunk_id]):
        print("Error: Missing required environment variables in .env.local")
        sys.exit(1)

    print(f"Connecting to LiveKit... (Trunk: {trunk_id})")
    lk = api.LiveKitAPI(url, api_key, api_secret)
    
    # Append the phone number and attempt to the room name so the agent knows
    # e.g. practice-call-+919353143053-1
    room_name = f"practice-call-{args.phone}-{args.attempt}"
    
    try:
        print(f"Creating Room {room_name} and dispatching agent...")
        # Explicitly configure the room to wake up our agent when the SIP call connects
        await lk.room.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=300,
                agents=[
                    ad_proto.RoomAgentDispatch(agent_name="my-agent")
                ]
            )
        )

        print(f"Dialing {args.phone}...")
        await lk.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=args.phone,
                room_name=room_name,
                participant_identity="phone-student",
            )
        )
        print(f"✅ Call initiated successfully!")
        print("Wait for your phone to ring. The agent will join the room and greet you.")
    except Exception as e:
        print(f"❌ Failed to initiate call: {e}")
        print("Outcome Handling: Detected Busy, No Answer, or Invalid Number.")
        if args.attempt == 1:
            print("Retry Rule: Scheduling a 2-minute retry since this was attempt 1.")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            delayed_caller = os.path.join(script_dir, "delayed_caller.py")
            # We use subprocess.Popen with creationflags/close_fds to detach it so this script can exit safely
            kwargs = {}
            if sys.platform == "win32":
                kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
            else:
                kwargs["start_new_session"] = True

            subprocess.Popen(
                [sys.executable, delayed_caller, "--phone", args.phone, "--delay", "2", "--attempt", "2"],
                cwd=script_dir,
                **kwargs
            )
        else:
            print("Retry Rule: This was a retry attempt. Giving up to avoid infinite loops.")
    finally:
        await lk.aclose()

if __name__ == "__main__":
    asyncio.run(main())
