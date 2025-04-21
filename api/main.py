from fastapi import FastAPI, Query
from dotenv import load_dotenv
import os
from typing import Optional

app = FastAPI()

# load the api key from the .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(api_key)

@app.get("/")
async def read_root():
    return {"message": "Hello World"} 

@app.get("/satellite-info")
async def get_satellite_info(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    # Parameters are automatically validated
    # No need for manual sanitization
    return {
        "group": group,
        "name": name
    } 

