import os
from dotenv import load_dotenv
import openai
from flask import Flask, render_template, request, Response, stream_with_context, jsonify, session
import json
import time
import logging
import sys
import secrets
from flask_session import Session  # Import Flask-Session
from flask_cors import CORS  # Add this import
from cachetools import TTLCache
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from datetime import datetime, timedelta
import asyncio
from time import perf_counter

# Silence EVERYTHING at the root level
logging.getLogger().setLevel(logging.CRITICAL)

# Explicitly silence the specific loggers we're seeing
for logger_name in ["httpx", "__main__", "werkzeug", "openai"]:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)
    logging.getLogger(logger_name).propagate = False

# Our app logger should also be silent
logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)
logger.propagate = False

# Force reload of environment variables
load_dotenv(override=True)

# Log environment setup
logger.info("Environment setup:")
logger.info(f"API Key length: {len(os.getenv('OPENAI_API_KEY', ''))} chars")
logger.info(f"Assistant ID present: {bool(os.getenv('OPENAI_ASSISTANT_ID'))}")
logger.info(f"Project ID present: {bool(os.getenv('OPENAI_PROJECT_ID'))}")

# At the top with other globals
client = None  # Global OpenAI client
thread_cache = TTLCache(maxsize=100, ttl=24*60*60)  # 24 hour retention
executor = ThreadPoolExecutor(max_workers=10)
response_cache = TTLCache(maxsize=100, ttl=3600)
conversation_context = {}

# After environment variables are loaded
def init_openai():
    global client
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        client._custom_headers = {"OpenAI-Beta": "assistants=v2"}
        return True
    except Exception as e:
        return False

# Initialize before app starts
logger.info("Starting OpenAI initialization...")
logger.info(f"Environment variables present:")
logger.info(f"OPENAI_API_KEY: {'set' if os.getenv('OPENAI_API_KEY') else 'not set'}")
logger.info(f"OPENAI_ASSISTANT_ID: {'set' if os.getenv('OPENAI_ASSISTANT_ID') else 'not set'}")
if not init_openai():
    logger.error("OpenAI initialization failed - check previous logs for details")
    raise RuntimeError("Failed to initialize OpenAI client")

# Get API key, assistant ID, and project ID
api_key = os.getenv("OPENAI_API_KEY")
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
project_id = os.getenv("OPENAI_PROJECT_ID")

# Create Flask app
app = Flask(__name__)

# Update CORS to be more dynamic
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",  # Local frontend
            "https://barilla-frontend-tp3puay2aq-uc.a.run.app",
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

app.secret_key = secrets.token_hex(32)
app.config.update(
    SESSION_TYPE='filesystem',
    SESSION_PERMANENT=False,
    SESSION_USE_SIGNER=True,
    SESSION_FILE_DIR='/tmp/flask_session',  # Use temp directory in container
    PROPAGATE_EXCEPTIONS=True,
    PREFERRED_URL_SCHEME='https',
    threaded=True,
    executor=executor
)

# Initialize the session
Session(app)

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in [
        "http://localhost:3000",
        "https://barilla-frontend-tp3puay2aq-uc.a.run.app"
    ]:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route('/')
def home():
    """Render the home page."""
    return render_template('chat.html')

def get_cached_response(message: str, thread_id: str) -> Optional[str]:
    cache_key = f"{thread_id}:{message}"
    return response_cache.get(cache_key)

def set_cached_response(message: str, thread_id: str, response: str):
    cache_key = f"{thread_id}:{message}"
    response_cache[cache_key] = response

def get_or_create_thread(user_id: str):
    if user_id in thread_cache:
        return thread_cache[user_id]
    
    # Create new thread with initial context
    thread = client.beta.threads.create()
    thread_cache[user_id] = thread.id
    
    # Initialize context
    conversation_context[thread.id] = {
        'created_at': datetime.now(),
        'last_active': datetime.now(),
        'message_count': 0,
        'summary': ''
    }
    
    return thread.id

async def summarize_conversation(thread_id: str):
    """Periodically summarize conversation to maintain context"""
    try:
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        
        # Create summary request
        summary_run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id,
            instructions="Please provide a brief summary of the key points discussed so far."
        )
        
        # Wait for summary
        while True:
            run_status = client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=summary_run.id
            )
            if run_status.status == 'completed':
                break
            await asyncio.sleep(0.5)
        
        # Get summary
        summary_messages = client.beta.threads.messages.list(thread_id=thread_id)
        latest_summary = next(msg.content[0].text.value 
                            for msg in summary_messages 
                            if msg.role == "assistant")
        
        # Update context
        if thread_id in conversation_context:
            conversation_context[thread_id]['summary'] = latest_summary
            
    except Exception as e:
        logger.error(f"Error summarizing conversation: {str(e)}")

@app.route('/chat', methods=['POST'])
def chat():
    def generate():
        try:
            message = request.json.get('message', '')
            user_id = request.cookies.get('user_id')
            thread_id = get_or_create_thread(user_id)
            
            # Create message first
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            
            # Use real streaming
            run = client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=assistant_id,
                stream=True
            )
            
            full_response = ""
            for event in run:
                event_type = event.__class__.__name__
                if event_type == "ThreadMessageDelta":
                    if hasattr(event.data, 'delta') and hasattr(event.data.delta, 'content'):
                        for content_delta in event.data.delta.content:
                            if content_delta.type == 'text':
                                token = content_delta.text.value
                                full_response += token
                                # Don't add extra spaces that break markdown
                                yield f"data: {json.dumps({'token': token, 'full_response': full_response})}\n\n"
                elif event_type == "RunCompleted":
                    yield f"data: {json.dumps({'event': 'run_completed'})}\n\n"
                    break

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream',
            'Transfer-Encoding': 'chunked',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'  # Add keep-alive for better connection reuse
        }
    )
    return response

@app.route('/test')
def test():
    return "Server is running"

@app.route('/reset_thread', methods=['POST'])
def reset_thread():
    if 'thread_id' in session:
        del session['thread_id']
    return '', 204

@app.errorhandler(500)
def handle_500(e):
    return jsonify(error=str(e)), 500, {
        'Access-Control-Allow-Origin': request.headers.get('Origin'),  # Dynamic origin
        'Access-Control-Allow-Credentials': 'true'
    }

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        'apiUrl': request.url_root.rstrip('/')  # Returns the current backend URL
    })

def cleanup_old_threads():
    """Remove old threads and contexts"""
    current_time = datetime.now()
    expired_threads = []
    
    for thread_id, context in conversation_context.items():
        if current_time - context['last_active'] > timedelta(hours=24):
            expired_threads.append(thread_id)
    
    for thread_id in expired_threads:
        try:
            # Delete from OpenAI
            client.beta.threads.delete(thread_id)
            # Remove from local cache
            del conversation_context[thread_id]
            # Remove from thread cache
            for user_id, tid in thread_cache.items():
                if tid == thread_id:
                    del thread_cache[user_id]
                    break
        except Exception as e:
            logger.error(f"Error cleaning up thread {thread_id}: {str(e)}")

def init_assistant():
    try:
        assistant = client.beta.assistants.update(
            assistant_id=assistant_id,
            instructions="""
            Maintain conversation context by:
            1. Referencing previous messages when relevant
            2. Building upon earlier discussions
            3. Acknowledging when returning to previous topics
            4. Asking for clarification if context is unclear
            """,
            tools=[{"type": "retrieval"}]  # Enable knowledge retrieval
        )
        return assistant
    except Exception as e:
        logger.error(f"Error configuring assistant: {str(e)}")
        return None

if __name__ == "__main__":
    #  app.run(debug=True, port=5000)
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)

# After loading environment variables
logger.info("API Key present: %s", bool(api_key))
logger.info("Assistant ID present: %s", bool(assistant_id))
logger.info("Project ID present: %s", bool(project_id))