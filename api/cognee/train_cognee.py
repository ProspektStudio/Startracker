import requests
from typing import Optional
from doc_loader import load_webpages

COGNEE_BASE_URL = "http://127.0.0.1:8000/api/v1"
COGNEE_USERNAME = "default_user@example.com"
COGNEE_PASSWORD = "default_password"
COGNEE_DATASET_NAME = "startracker-dataset"
URLS_FILE = "urls.txt"

def get_access_token() -> str:
    response = requests.post(
        f"{COGNEE_BASE_URL}/auth/login",
        data={
            "username": COGNEE_USERNAME,
            "password": COGNEE_PASSWORD
        }
    )
    response.raise_for_status()
    return response.json()["access_token"]

def add_to_cognee(access_token: str, name: str, data_content: str) -> dict:

    # Prepare the request to Cognee
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    files = {
        "data": (name, data_content),
        "datasetName": (None, COGNEE_DATASET_NAME)
    }

    # Make the request to Cognee
    cognee_response = requests.post(
        f"{COGNEE_BASE_URL}/add",
        headers=headers,
        files=files
    )
    cognee_response.raise_for_status()
    
    return cognee_response.json()

def train_cognee(access_token: str) -> dict:
    """
    Train the Cognee model.

    Args:
        dataset_name: Name of the dataset to train
        access_token: Bearer token for authentication
        base_url: Base URL of the Cognee API
    
    Returns:
        dict: Response from the API
    """
    # Prepare the request to Cognee
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Make the request to Cognee
    cognee_response = requests.post(
        f"{COGNEE_BASE_URL}/cognify",
        headers=headers,
        json={"datasets": [COGNEE_DATASET_NAME]}
    )
    cognee_response.raise_for_status()
    
    return cognee_response.json()

if __name__ == "__main__":
    try:
        # Get access token
        print("Getting access token...")
        access_token = get_access_token()
        print(f"Access token obtained: {access_token[:10]}...")

        # Load URLs from urls.txt
        # webpage_urls = []
        # with open(URLS_FILE, "r") as f:
        #     for line in f:
        #         webpage_urls.append(line.strip())
        # print(webpage_urls)

        # Add documents to the knowledge graph
        # print("Adding documents to the knowledge graph...")
        # docs = load_webpages()
        # for i, doc in enumerate(docs):
        #     name = f"{i}.txt"
        #     print(f"Adding {doc.metadata['source']} as {name}...")
        #     add_to_cognee(access_token, name, doc.page_content)
        # print("Successfully added documents to the knowledge graph")
        
        # # Train the Cognee model
        print("Training the Cognee model...")
        train_cognee(access_token)
        print("Successfully trained the Cognee model")
        
    except Exception as e:
        print(f"Error: {e}")
