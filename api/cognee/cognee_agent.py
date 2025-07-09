import cognee
import asyncio
from cognee.api.v1.visualize.visualize import visualize_graph
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
    
    # Generate an HTML visualization of your graph
    await visualize_graph()
    
    # The file is saved in your current folder
    home_dir = os.path.expanduser("~")
    html_file = os.path.join(home_dir, "graph_visualization.html")
    # display(html_file)

if __name__ == '__main__':
    asyncio.run(main())
