import cognee
import asyncio
import sys
import os

from doc_loader import load_webpages

async def main():
    
    # Load the knowledge graph from the databases directory
    print('list_datasets:')
    await cognee.datasets.list_datasets()
    
    # Search the knowledge graph
    results = await cognee.search(
        # query_text="Give me information about CREW DRAGON 10"
        # query_text="Give me the most important and latest information about CREW DRAGON 10"
        query_text="When did CREW DRAGON 10 launch?"
    )
    
    print('---RESULTS---:')
    for result in results:
        print(result)

if __name__ == '__main__':
    asyncio.run(main())
