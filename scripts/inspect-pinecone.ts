
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const INDEX_NAME = 'agent-knowledge';
const NAMESPACE_ARTICLES = 'articles';

async function inspectPinecone() {
    console.log('🌲 Connecting to Pinecone...');

    // 1. Get API Key
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        console.error('❌ PINECONE_API_KEY not found in .env.local');
        return;
    }

    try {
        // 2. Initialize Client
        const pc = new Pinecone({ apiKey });
        const index = pc.index(INDEX_NAME);

        console.log(`📂 Querying namespace: ${NAMESPACE_ARTICLES}`);

        // 3. Get Stats
        const stats = await index.describeIndexStats();
        const count = stats.namespaces?.[NAMESPACE_ARTICLES]?.recordCount || 0;
        console.log(`📊 Total Articles Stored: ${count}`);

        if (count === 0) {
            console.log('⚠️ No articles found.');
            return;
        }

        // 4. Query for samples
        // We create a dummy vector of length 1024 (standard for mult-e5 or similar) 
        // OR 384 (all-MiniLM). Pinecone stores dimension in stats.
        const dimension = stats.dimension || 1024;
        console.log(`ℹ️ Vector Dimension: ${dimension}`);

        const dummyVector = Array(dimension).fill(0.1);

        const queryResponse = await index.namespace(NAMESPACE_ARTICLES).query({
            vector: dummyVector,
            topK: 20,
            includeMetadata: true
        });

        console.log('\n📝 Recent Articles (Top 20 matches to random vector):');
        console.log('---------------------------------------------------');

        if (queryResponse.matches) {
            queryResponse.matches.forEach((match, i) => {
                const title = match.metadata?.title || 'Unknown Title';
                const source = match.metadata?.source || 'Unknown Source';
                const date = match.metadata?.storedAt || 'Unknown Date';
                console.log(`${i + 1}. [${source}] ${title}`);
                console.log(`   📅 Stored: ${date} | ID: ${match.id.substring(0, 8)}...`);
            });
        }

    } catch (error) {
        console.error('❌ Error inspecting Pinecone:', error);
    }
}

inspectPinecone();
