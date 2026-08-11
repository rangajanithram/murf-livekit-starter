import asyncio
import os
import sys
import argparse
from dotenv import load_dotenv
from livekit import api

load_dotenv(".env.local")

async def main():
    parser = argparse.ArgumentParser(description="Trigger an outbound call via LiveKit SIP")
    parser.add_argument("--phone", required=True, help="Phone number to call (e.g. +919353143053)")
    args = parser.parse_args()

    # Load credentials
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    trunk_id = os.getenv("LIVEKIT_SIP_OUTBOUND_TRUNK_ID")

    if not all([url, api_key, api_secret, trunk_id]):
        print("Error: Missing required environment variables in .env.local")
        print("Make sure LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_SIP_OUTBOUND_TRUNK_ID are set.")
        sys.exit(1)

    print(f"Connecting to LiveKit... (Trunk: {trunk_id})")
    lk = api.LiveKitAPI(url, api_key, api_secret)
    
    room_name = f"practice-call-{os.urandom(4).hex()}"
    
    print(f"Dialing {args.phone}...")
    try:
        await lk.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=args.phone,
                room_name=room_name,
                participant_identity="phone-student",
            )
        )
        print(f"✅ Call initiated successfully! Room: {room_name}")
        print("Wait for your phone to ring. The agent will join the room and greet you.")
    except Exception as e:
        print(f"❌ Failed to initiate call: {e}")
    finally:
        await lk.aclose()

if __name__ == "__main__":
    asyncio.run(main())
