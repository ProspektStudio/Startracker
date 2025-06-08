import cognee
import asyncio
import sys
import os

from doc_loader import load_webpages

async def main():
    # Add documents to the knowledge graph
    docs = load_webpages()
    for doc in docs:
        await cognee.add(doc.page_content)
    
    # Process with LLMs to build the knowledge graph
    await cognee.cognify()
    
    # Search the knowledge graph
    results = await cognee.search(
        query_text="Give me information about CREW DRAGON 10"
    )
    
    print('---RESULTS---:')
    for result in results:
        print(result)

if __name__ == '__main__':
    asyncio.run(main())
