from flask import Flask, request, jsonify, Response
import os
#from werkzeug.utils import secure_filename
import uuid
import createImage
import counter
import base64
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
import utils
from dotenv import load_dotenv

load_dotenv()

# db_params = {
#         'host': os.environ.get('HOST'),
#         'database': os.environ.get('DATABASE'),
#         'user': os.environ.get('USER'),
#         'password': os.environ.get('PASSWORD'),
#         'port': int(os.environ.get('DATABASE_PORT'))
#     }
# initialize_connection_pool(db_params, min_connections=2, max_connections=10)
schema_name = os.environ.get('SCHEMA_NAME')

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'static'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/upload-video', methods=['POST'])
def upload_video():
    # Check if a file is included in the request
    if 'video' not in request.files:
        return jsonify({'error': 'No video part in the request'}), 400
    
    file = request.files['video']
    
    # Check if a file was selected
    if file.filename == '':
        return jsonify({'error': 'No video selected'}), 400
    
    
    # Validate file extension
    if file and allowed_file(file.filename):
        # Generate a unique filename to avoid conflicts
        #filename = secure_filename(file.filename)
        filename = file.filename
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        try:
            # Save the file
            file.save(file_path)
            file_size = os.path.getsize(file_path) / (1024 * 1024)  # Size in MB
            imageFileName=createImage.create_image(file_path, app.config['UPLOAD_FOLDER'])
            return jsonify({
                'message': 'Video uploaded successfully',
                'filename': unique_filename,
                'file_path': file_path,
                'image':f'/static/{imageFileName}',
                'file_size_mb': round(file_size, 2)
            }), 200
        except Exception as e:
            return jsonify({'error': f'Failed to save file: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Allowed types: mp4, avi, mov, mkv'}), 400
    
@app.route('/api/upload', methods=['POST'])
def upload_image():
    # Check if a file is included in the request
    if 'image' not in request.files:
        return jsonify({'error': 'No image part in the request'}), 400
    
    file = request.files['image']
    
    # Check if a file was selected
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    base64_image = base64.b64encode(file.read()).decode()
    system_prompt="""
Carefully count all animals in the image, ensuring that even partially visible animals are included. Accuracy is crucial.
Provide a precise count of every animal visible in the image. Double-check your count to minimize errors.

Count all animals in the image, but do not include any shadows or other objects that are not animals.
Identify and count only the animals present in the image. Ignore any other elements.

If animals are overlapping, count each individual animal separately.

Recipe = {"animal_name": string, "count": number}
Return: array<Recipe>
"""
    # Validate file extension
    message = HumanMessage(
        content=[
            {"type": "text", "text": system_prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            }
        ]
    )
    llm = init_chat_model(
        model="gemini-2.0-flash", 
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.7, 
        model_provider="google_genai"
    )
    response = llm.invoke([message])
    success, data, err =utils.extract_json(response.content)
    return data, 200
  
@app.route('/api/stream')
def stream():
    """Returns a streaming response."""
    video = request.args.get('video')  # Get the value of the 'q' parameter
    line = request.args.get('line') 
    x1,y1,x2,y2=map(int, line.split(','))
    return Response(counter.count_object(os.path.join(app.config['UPLOAD_FOLDER'], video), (x1,y1), (x2,y2)), mimetype='application/json') 

@app.route('/api/time')
def get_current_time():
    import time
    return {'time': time.time()}

