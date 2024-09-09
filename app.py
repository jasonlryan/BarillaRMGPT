import os
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, render_template, request, Response, stream_with_context, jsonify, session
import json
import time
import logging
import sys
from flask_session import Session  # Import Flask-Session

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Force reload of environment variables
load_dotenv(override=True)

# Get API key, assistant ID, and project ID
api_key = os.getenv("OPENAI_API_KEY")
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")
project_id = os.getenv("OPENAI_PROJECT_ID")

# Set up OpenAI client
client = OpenAI(api_key=api_key, project=project_id)

# Create Flask app
app = Flask(__name__)
app.secret_key = 'a_very_secret_key_12345'  # Replace with your own secret key
app.config['SESSION_TYPE'] = 'filesystem'  # Ensure session type is set
app.config['SESSION_PERMANENT'] = False  # Ensure sessions are not permanent
app.config['SESSION_USE_SIGNER'] = True  # Sign the session cookies
app.config['SESSION_FILE_DIR'] = './flask_session/'  # Directory to store session files

# Initialize the session
Session(app)

@app.route('/')
def home():
    """Render the home page."""
    return render_template('chat.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json['message']
    thread_id = request.json.get('thread_id')
    logger.info(f"Received thread_id from client: {thread_id}")

    def generate():
        nonlocal thread_id
        try:
            if not thread_id:
                thread = client.beta.threads.create()
                thread_id = thread.id
                session['thread_id'] = thread_id  # Store thread_id in session
                session.modified = True  # Ensure session is marked as modified
                logger.info(f"Created new thread with ID: {thread_id}")
                logger.info(f"Session thread_id after creation: {session.get('thread_id')}")
                yield f"data: {json.dumps({'event': 'thread_created', 'thread_id': thread_id})}\n\n"
            else:
                logger.info(f"Using existing thread with ID: {thread_id}")

            # Check for any active runs and wait for them to complete
            while True:
                runs = client.beta.threads.runs.list(thread_id=thread_id)
                active_runs = [run for run in runs.data if run.status in ['queued', 'in_progress']]
                if not active_runs:
                    break
                logger.info("Waiting for previous run to complete...")
                time.sleep(1)
                yield f"data: {json.dumps({'event': 'waiting_for_previous_run'})}\n\n"

            # Add the new message
            client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=user_message
            )

            # Create and stream the new run
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
                                yield f"data: {json.dumps({'token': token, 'full_response': full_response, 'thread_id': thread_id})}\n\n"
                elif event_type == "RunCompleted":
                    yield f"data: {json.dumps({'event': 'run_completed'})}\n\n"
                    break

        except Exception as e:
            logger.error(f"Error in chat: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = Response(stream_with_context(generate()), mimetype='text/event-stream')
    logger.info(f"Session thread_id at end: {session.get('thread_id')}")
    return response

@app.route('/test')
def test():
    return "Server is running"

@app.route('/reset_thread', methods=['POST'])
def reset_thread():
    if 'thread_id' in session:
        del session['thread_id']
    return '', 204

if __name__ == "__main__":
    app.run(debug=True)