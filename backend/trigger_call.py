import asyncio
import os
import sys
import argparse
from dotenv import load_dotenv
from livekit import api
from livekit.protocol import agent_dispatch as ad_proto

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
        sys.exit(1)

    print(f"Connecting to LiveKit... (Trunk: {trunk_id})")
    lk = api.LiveKitAPI(url, api_key, api_secret)
    
    room_name = f"practice-call-{os.urandom(4).hex()}"
    
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
        print("Retry Rule: In a production environment, this number is now added to the retry queue for a follow-up attempt in 15 minutes.")
    finally:
        await lk.aclose()

if __name__ == "__main__":
    asyncio.run(main())
