import cognee
import asyncio
import sys

async def main():
    print('Python path:', sys.path)
    print('Cognee module location:', cognee.__file__)
    print('Cognee module contents:', dir(cognee))
    print('Cognee version: ', cognee.__version__)
    
    # Add sample content
    text = "Natural language processing (NLP) is a subfield of computer science."
    await cognee.add(text)
    
    # Process with LLMs to build the knowledge graph
    await cognee.cognify()
    
    # Search the knowledge graph
    results = await cognee.search(
        query_text="Tell me about NLP"
    )
    
    print('---RESULTS---:')
    for result in results:
        print(result)

if __name__ == '__main__':
    asyncio.run(main())
