from cognee.api.v1 import datasets, visualize

# Generate an HTML visualization of your graph
async def render_graph():
    # response = await api.visualize.visualize_graph()
    response = await datasets.list_datasets()
    print(response)
    return response

if __name__ == "__main__":
    import asyncio
    asyncio.run(render_graph())
