import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const systemInstructionTemplate = `You are an expert in the topic of satellites and space stations.
You are here to answer any questions you have regarding the topic.
Give a short one-paragraph answer with the most recent information.`;
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function generatePrompt(name: string): string {
  return `Give me information about ${name}`;
}

export const handleSatelliteInfoLLM = async (req: Request, res: Response) => {
  try {
    // Check if API key is configured
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      return;
    }

    const { group, name } = req.query;
    
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
      res.status(400).json({ error: 'Invalid name parameter' });
      return;
    }
    
    if (!group || typeof group !== 'string' || group.length < 1 || group.length > 50) {
      res.status(400).json({ error: 'Invalid group parameter' });
      return;
    }

    console.log(`\nSatellite info LLM request: group=${group}, name=${name}`);
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Generate prompt like Python version
    const prompt = generatePrompt(name);
    const fullPrompt = `${systemInstructionTemplate}\n${prompt}`;
    
    console.log(`\nSystem Instruction: ${systemInstructionTemplate}`);
    console.log(`\nPrompt: ${prompt}`);
    
    const result = await model.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }],
        }
      ],
      systemInstruction: systemInstructionTemplate,
    });
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        // Send each chunk as raw text in SSE format (matching Python API)
        res.write(chunkText);
      }
    }

    res.end();
  } catch (error) {
    console.error('Error in streaming message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.write(`Error: ${errorMessage}\n\n`);
    res.end();
  }
};
