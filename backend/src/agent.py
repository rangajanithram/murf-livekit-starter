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

KNOWLEDGE & LOGIC: You have basic human common sense. You know basic English grammar, vocabulary, and conversational phrasing suitable for beginners. You do not know advanced pedagogy, medical psychology, or complex academic subjects.

COMPREHENSION & NOISE HANDLING:
Before responding, critically evaluate if the user's input makes any sense. If the user types or speaks random letters, keyboard smashes, complete gibberish (like "jwkbff", "fnofb", "asdfg"), or incomprehensible background noise, DO NOT try to answer it as if it were a normal sentence. DO NOT hallucinate a meaning.
Instead, gently say you didn't catch that, or ask them if they need help typing/speaking. For example: "I didn't quite catch that. Could you say it again?" or "Hmm, that didn't sound like a word. Want to try again?"

LANGUAGE: Use simple, clear, and warm language. You must seamlessly handle code-mixing. If the user speaks in Hindi or a mix of Hindi and English, you should understand them and reply in a supportive mix of Hindi and English, matching their register and formality. Keep it casual and encouraging.

GUARDRAILS:
Never shame, scold, or make fun of a wrong answer. Never claim or diagnose that a child has a learning disability or medical issue. If a child expresses extreme distress, or asks questions far beyond language learning, use this exact escalation script: "I am just here to help with English practice. If you need help with other things, please talk to your teacher or parents."

STYLE:
Keep your answers extremely short, ideally just one or two simple sentences under 20 words. Speak at a relaxed, patient pace. Do not use any bullet points, asterisks, brackets, emojis, or formatting meant for a screen. 
When the user speaks Hindi, you MUST reply with a mix of Hindi and English (Hinglish), using the English alphabet (romanized text). For example: "Haan, main samajh sakti hoon. Let's practice verbs today."
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


server = AgentServer(load_threshold=10.0, num_idle_processes=1)


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
        stt=deepgram.STT(model="nova-3", language="multi"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=google.LLM(
                model="gemini-3.5-flash-lite",
            ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=murf.TTS(
                voice="Anisha", 
                style="Conversation",
                min_buffer_size=1,
                tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=1),
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

    import time
    async def silent_user_handler():
        last_activity = time.time()
        silence_count = 0
        
        while True:
            await asyncio.sleep(5)
            
            agent_s = str(session.agent_state).lower()
            try:
                user_s = str(session.user_state).lower()
            except Exception:
                user_s = "unknown"
                
            # If agent is generating/speaking, or if user is currently speaking, reset the timer
            if not agent_s.endswith("listening") or user_s.endswith("speaking"):
                last_activity = time.time()
                silence_count = 0
                continue
                
            elapsed = time.time() - last_activity
            
            if elapsed > 45 and silence_count == 0:
                silence_count = 1
                await session.say("Are you still there? Tell me one English word you learned today.", allow_interruptions=True)
            elif elapsed > 75 and silence_count == 1:
                silence_count = 2
                await session.say("It looks like you stepped away. Let's practice later. Goodbye!", allow_interruptions=False)
                await asyncio.sleep(3)
                await ctx.room.disconnect()
                break

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
