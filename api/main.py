from fastapi import FastAPI, Query
from dotenv import load_dotenv
import os
from google import genai
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# set up the gemini client
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# set cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
async def read_root():
    return {"message": "Hello World"} 

@app.get("/api/satellite-info")
async def get_satellite_info(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    response = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=f"Give me information about the satellite {name} in the group {group}")
    return {
        "satellite_info": response.text
    }

