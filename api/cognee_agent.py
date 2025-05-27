import cognee
import asyncio
import os
from dotenv import load_dotenv
from cognee_config import COGNEE_CONFIG

load_dotenv(verbose=True)

# Initialize cognee with config
# cognee.init(config=COGNEE_CONFIG)

async def main():
    # Debug: Print environment variables
    print("GOOGLE_API_KEY:", os.getenv('GOOGLE_API_KEY'))
    print("LLM_API_KEY:", os.getenv('LLM_API_KEY'))
    print("GOOGLE_APPLICATION_CREDENTIALS:", os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))
    print("COGNEE_EMBEDDING_PROVIDER:", os.getenv('COGNEE_EMBEDDING_PROVIDER'))
    print("COGNEE_EMBEDDING_MODEL:", os.getenv('COGNEE_EMBEDDING_MODEL'))

    # Add sample content
    text = "Natural language processing (NLP) is a subfield of computer science."
    await cognee.add(text)

    # Process with LLMs to build the knowledge graph
    await cognee.cognify()

    # Search the knowledge graph
    results = await cognee.search(
        query_text="Tell me about NLP"
    )

    for result in results:
        print(result)


if __name__ == '__main__':
    asyncio.run(main())
