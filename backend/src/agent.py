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
from livekit.agents import function_tool, RunContext, mcp
import aiohttp
import database

# Initialize the memory database
database.init_db()

logger = logging.getLogger("agent")

load_dotenv(".env.local")

SYSTEM_PROMPT = """
IDENTITY: You are Lexi, a friendly, patient, and encouraging English language tutor for children in rural India, working for a grassroots literacy NGO.

OBJECTIVES: 
Help children practice basic spoken English in a stress-free environment. Build their confidence by giving positive reinforcement. Keep them engaged by asking simple, relatable questions about their day or surroundings.

KNOWLEDGE & LOGIC: You have basic human common sense. You know basic English grammar, vocabulary, and conversational phrasing suitable for beginners. To keep learning fun, you also have broad knowledge of general knowledge, basic science, history, social studies, and sports. 
Whenever a user asks a factual question about grammar, science, history, or sports, you MUST use the `search_knowledge` tool to fetch the correct facts from your syllabus before answering. Answer them properly and interestingly, using them as a fun way to teach English! You do not know medical psychology or highly complex academic subjects.

For general knowledge questions outside your syllabus, or for real-time information, you have access to a Wikipedia search tool. Use it whenever a user asks about historical figures, real-time facts, or places! ALWAYS mention the current date and time if it is a real-time question, and announce that you are looking it up on Wikipedia.

When the user asks for a quiz, challenge, or exercise, first ask them what difficulty they want (easy, medium, or hard). Once they choose, you MUST use the `fetch_trivia_exercise` tool to retrieve a live, real-time question from the Open Trivia Database. Do not hallucinate questions. If you know the user's favorite topics from their profile, pass it to the tool without asking! Keep asking them questions continuously one after another until they explicitly say to stop. Keep track of their score in your memory, and announce their final score when they stop.

COMPREHENSION & NOISE HANDLING:
Before responding, critically evaluate if the user's input makes any sense. If the user types or speaks random letters, keyboard smashes, complete gibberish (like "jwkbff", "fnofb", "asdfg"), or incomprehensible background noise, DO NOT try to answer it as if it were a normal sentence. DO NOT hallucinate a meaning.
Instead, gently say you didn't catch that, or ask them if they need help typing/speaking. For example: "I didn't quite catch that. Could you say it again?" or "Hmm, that didn't sound like a word. Want to try again?"

LANGUAGE & PROGRESSION: 
Your primary goal is to teach English to absolute beginners whose native language is Hindi.
When the conversation starts, speak ALMOST ENTIRELY in Hindi so the user can understand you perfectly.
As the conversation progresses and the user correctly understands or answers basic English questions, GRADUALLY introduce more English words and sentences into your responses based on their performance. If they struggle, make mistakes, or don't understand, revert back to using more Hindi to explain the concepts and encourage them.

LANGUAGE & SCRIPT:
Always write every language in its own native script.
Hindi → Devanagari (नमस्ते), never romanized (never "namaste").
Same rule for all non-English languages.

GUARDRAILS:
Never shame, scold, or make fun of a wrong answer. Never claim or diagnose that a child has a learning disability or medical issue. If a child expresses extreme distress, or asks questions far beyond language learning, use this exact escalation script: "मैं यहाँ सिर्फ इंग्लिश सिखाने के लिए हूँ। अगर आपको किसी और मदद की ज़रूरत है, तो कृपया अपने माता-पिता से बात करें।"

MEMORY & PROFILE:
You have a database to remember your regular students. You MUST ask the user's permission before saving their profile.
If a user is new, ask them if they want you to remember their progress: "क्या मैं आपका नाम और जो हमने सीखा है, उसे याद रख सकती हूँ?"
If they say yes, use the `save_user_profile` tool to save their name, current level, topics covered, and mistakes.
If a user asks you what their name is, use the `lookup_user` tool to retrieve their profile.
If a user asks you to forget them, use the `forget_user` tool to delete their profile.

STYLE:
Keep your answers extremely short, ideally just one or two simple sentences under 20 words. Speak at a relaxed, patient pace. Do not use any bullet points, asterisks, brackets, emojis, or formatting meant for a screen. 
"""


class Assistant(Agent):
    def __init__(self, room: rtc.Room, additional_tools: list = None) -> None:
        tools = additional_tools or []
        super().__init__(instructions=SYSTEM_PROMPT, tools=tools)
        self.user_id = room.name.rsplit('_', 1)[0]
        self.room = room

    @function_tool
    async def lookup_user(self, context: RunContext):
        """Use this tool to look up the current caller's profile."""
        logger.info(f"Looking up user {self.user_id}")
        user = database.get_user(self.user_id)
        if user:
            return f"Found profile for {user['name']}. Level: {user['current_level']}, Topics covered: {user['topics_covered']}, Mistakes: {user['mistakes']}"
        return f"No profile found."

    @function_tool
    async def save_user_profile(self, context: RunContext, name: str, language_preference: str, current_level: str, topics_covered: str, mistakes: str):
        """Use this tool to save or update the current caller's profile. You MUST ask for permission before using this.
        
        Args:
            name: The user's proper name
            language_preference: The user's preferred language
            current_level: The user's current English level (e.g. "Absolute Beginner")
            topics_covered: A brief summary of topics discussed
            mistakes: A brief summary of common mistakes made
        """
        logger.info(f"Saving profile for {self.user_id}")
        database.save_user(self.user_id, name, language_preference, current_level, topics_covered, mistakes)
        return "Profile saved successfully."

    @function_tool
    async def forget_user(self, context: RunContext):
        """Use this tool to delete the user's profile if they ask to be forgotten."""
        logger.info(f"Deleting profile for {self.user_id}")
        success = database.delete_user(self.user_id)
        if success:
            return "Profile deleted successfully."
        return "Profile not found."

    @function_tool
    async def search_knowledge(self, context: RunContext, query: str):
        """Use this tool to search the syllabus knowledge base for facts about grammar, history, science, or sports.
        
        Args:
            query: The question or keyword to search for (e.g. "verb" or "sky blue")
        """
        logger.info(f"Searching knowledge base for: {query}")
        results = database.search_knowledge(query)
        if results:
            formatted = "\n".join([f"Topic: {r['topic']} - {r['content']}" for r in results])
            return f"Found these facts:\n{formatted}"
        return "No information found in the syllabus for that topic."

    @function_tool
    async def fetch_trivia_exercise(self, context: RunContext, topic: str, difficulty: str = "easy"):
        """Use this tool to fetch a real multiple-choice trivia exercise for the user to practice their English and general knowledge.
        
        Args:
            topic: The preferred topic. Can be "general", "history", "sports", or "science".
            difficulty: The difficulty level. Must be "easy", "medium", or "hard".
        """
        logger.info(f"Fetching {difficulty} trivia exercise for topic: {topic}")
        
        category_map = {
            "history": 23,
            "sports": 21,
            "science": 17,
            "general": 9
        }
        category_id = category_map.get(topic.lower(), 9)
        url = f"https://opentdb.com/api.php?amount=1&category={category_id}&difficulty={difficulty.lower()}&type=multiple"
        
        try:
            async with aiohttp.ClientSession() as session:
                # 5-second timeout to handle failure path gracefully
                async with session.get(url, timeout=5) as response:
                    if response.status != 200:
                        return "I'm having trouble connecting to the live exercise database right now. Let's practice something else instead!"
                    data = await response.json()
                    if data.get("response_code") == 0:
                        question = data["results"][0]
                        q_text = question["question"]
                        correct = question["correct_answer"]
                        incorrect = ", ".join(question["incorrect_answers"])
                        import json
                        if self.room:
                            await self.room.local_participant.publish_data(
                                json.dumps({"type": "trivia_question", "text": q_text}).encode("utf-8")
                            )
                        return f"Here is a live question fetched just now from the trivia database: {q_text}. The correct answer is {correct}, and incorrect options are {incorrect}. Ask this to the user in a fun way! (Wait for their answer before scoring it)."
                    return "The live exercise database is empty for this topic right now. Let's try something else!"
        except Exception as e:
            logger.error(f"Failed to fetch exercise: {e}")
            return "The live exercise database seems to be offline or timed out. Let's practice normal conversation instead!"


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

    # Join the room and connect to the user immediately so we don't hit the 10s connection timeout
    # while waiting for the MCP server to initialize
    await ctx.connect()

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
    
    import sys
    import asyncio
    cmd = "wikipedia-mcp.cmd" if sys.platform == "win32" else "wikipedia-mcp"
    mcp_server = mcp.MCPServerStdio(command=cmd, args=[], client_session_timeout_seconds=60.0)
    
    assistant = Assistant(ctx.room, additional_tools=[])
    
    async def load_mcp():
        try:
            logger.info("Initializing MCP server in background...")
            await mcp_server.initialize()
            wikipedia_tools = await mcp_server.list_tools()
            logger.info(f"Loaded {len(wikipedia_tools)} Wikipedia tools.")
            if hasattr(assistant, "update_tools"):
                new_tools = list(assistant.tools) + wikipedia_tools
                await assistant.update_tools(new_tools)
            else:
                logger.error("assistant.update_tools not found, cannot add MCP tools!")
        except Exception as e:
            logger.error(f"Failed to load MCP tools: {e}")
            
    asyncio.create_task(load_mcp())

    await session.start(
        agent=assistant,
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
    
    # Register the MCP toolset to the agent's LLM (removed, handled in init)


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

    # Wait briefly to ensure the agent's audio track is fully published
    await asyncio.sleep(2)

    # Check if returning user
    user_id = ctx.room.name.rsplit('_', 1)[0]
    user = database.get_user(user_id)
    if user:
        await session.say(f"नमस्ते {user['name']}! आपसे दोबारा मिलकर अच्छा लगा।", allow_interruptions=True)
    else:
        # Initial greeting
        await session.say("नमस्ते! मैं लेक्सी हूँ, आपकी इंग्लिश ट्यूटर। आज आप कैसे हैं?", allow_interruptions=True)

    # Start the silence timeout handler ONLY AFTER the agent is connected and has greeted
    asyncio.create_task(silent_user_handler())


if __name__ == "__main__":
    cli.run_app(server)
