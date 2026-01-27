import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const indexName = 'news-feeder';

async function createIndex() {
    try {
        console.log(`Checking if index '${indexName}' exists...`);
        const { indexes } = await pc.listIndexes();

        const exists = indexes?.some(idx => idx.name === indexName);

        if (exists) {
            console.log(`Index '${indexName}' already exists.`);
            return;
        }

        console.log(`Creating index '${indexName}' (768 dimensions, cosine)...`);
        await pc.createIndex({
            name: indexName,
            dimension: 768, // Jina v2 base en
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });

        console.log(`Index '${indexName}' created successfully.`);
    } catch (error) {
        console.error('Error creating index:', error);
    }
}

createIndex();
