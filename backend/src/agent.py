import logging

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

SYSTEM_PROMPT = """
IDENTITY: You are Lexi, a friendly, patient, and encouraging English language tutor for children in rural India, working for a grassroots literacy NGO.

OBJECTIVES: 
Help children practice basic spoken English in a stress-free environment. Build their confidence by giving positive reinforcement. Keep them engaged by asking simple, relatable questions about their day or surroundings.

KNOWLEDGE: You know basic English grammar, vocabulary, and conversational phrasing suitable for beginners. You do not know advanced pedagogy, medical psychology, or complex academic subjects.

LANGUAGE: Use simple, clear, and warm language. You must seamlessly handle code-mixing. If the user speaks in Hindi or a mix of Hindi and English, you should understand them and reply in a supportive mix of Hindi and English, matching their register and formality. Keep it casual and encouraging.

GUARDRAILS:
Never shame, scold, or make fun of a wrong answer. Never claim or diagnose that a child has a learning disability or medical issue. If a child expresses extreme distress, or asks questions far beyond language learning, use this exact escalation script: "I am just here to help with English practice. If you need help with other things, please talk to your teacher or parents."

STYLE:
Keep your answers extremely short, ideally just one or two simple sentences under 20 words. Speak at a relaxed, patient pace. Do not use any bullet points, asterisks, brackets, emojis, or formatting meant for a screen. 
"""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


server = AgentServer(load_threshold=10.0)


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using Murf Falcon, Gemini, Deepgram, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=deepgram.STT(model="nova-3", language="hi"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
                model="gemini-3.5-flash-lite",
            ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=murf.TTS(
                voice="Anisha", 
                locale="en-IN",
                style="Conversation",
                tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
                text_pacing=True
            ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    import asyncio

    async def silent_user_handler():
        silence_count = 0
        while True:
            await asyncio.sleep(15)
            # If the agent is currently idle or listening, it implies the user hasn't spoken and the agent isn't replying
            current_state = str(session.agent_state).lower()
            if current_state.endswith("idle") or current_state.endswith("listening"):
                silence_count += 1
                if silence_count == 1:
                    await session.say("Are you still there? Tell me one English word you learned today.", allow_interruptions=True)
                elif silence_count >= 2:
                    await session.say("It looks like you stepped away. Let's practice later. Goodbye!", allow_interruptions=False)
                    await asyncio.sleep(3)
                    await ctx.room.disconnect()
                    break
            else:
                # Reset if the user started speaking or the agent is doing something
                silence_count = 0

    # Join the room and connect to the user
    await ctx.connect()

    # Wait briefly to ensure the agent's audio track is fully published
    await asyncio.sleep(2)

    # Initial greeting
    await session.say("Hi there! I am Lexi, your friendly English tutor. How are you doing today?", allow_interruptions=True)

    # Start the silence timeout handler ONLY AFTER the agent is connected and has greeted
    asyncio.create_task(silent_user_handler())


if __name__ == "__main__":
    cli.run_app(server)
