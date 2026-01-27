import nlp from 'compromise';
import { FeederArticle } from './types';

export interface NerResult {
    unique: FeederArticle[];
    duplicates: FeederArticle[];
    stats: {
        checked: number;
        duplicatesFound: number;
    };
}

/**
 * Layer 4: NER Event Fingerprinting
 * Uses 'compromise' library to extract named entities and build an event fingerprint.
 * 
 * Fingerprint Structure: "EVENT_KEYWORD|LOCATION|MAIN_ENTITY|DATE"
 * Example: "blast|peshawar|market|2026-01-24"
 */
export async function checkNerDuplicates(
    articles: FeederArticle[],
    existingFingerprints: string[] // This is now ignored in favor of DB check inside or passed correctly
): Promise<NerResult> {
    const unique: FeederArticle[] = [];
    const duplicates: FeederArticle[] = [];
    const derivedFingerprints = new Set<string>();

    console.log(`[L4:NER] Fingerprinting ${articles.length} articles...`);

    // Import store to check DB
    const { hasSeenFingerprint } = await import('./permanent-store');
    const { cleanText } = await import('./utils');

    for (const article of articles) {
        // Combine title + snippet for better context
        const rawText = `${article.title}. ${article.content_snippet || ''}`;
        const textToAnalyze = cleanText(rawText);
        const doc = nlp(textToAnalyze);

        // 1. Extract Entities
        const people = doc.people().out('array');
        const places = doc.places().out('array');
        const orgs = doc.organizations().out('array');

        // 2. Extract Event Keywords with Synonym Mapping
        const EVENT_MAPPINGS: Record<string, string> = {
            // CRITICISM
            'slams': 'criticism', 'criticizes': 'criticism', 'condemns': 'criticism',
            'blames': 'criticism', 'warns': 'warning', 'threatens': 'warning',

            // CONFLICT
            'blast': 'conflict', 'explosion': 'conflict', 'attack': 'conflict',
            'strike': 'conflict', 'killed': 'conflict', 'dead': 'conflict',
            'murder': 'conflict', 'injured': 'conflict', 'raid': 'conflict', 'operation': 'conflict',

            // TRAVEL
            'visit': 'travel', 'visits': 'travel', 'arrives': 'travel',
            'lands': 'travel', 'departs': 'travel', 'meeting': 'travel', 'summit': 'travel',

            // POLITICAL / LEGAL
            'election': 'politics', 'polls': 'politics', 'vote': 'politics',
            'deal': 'agreement', 'agreement': 'agreement', 'pact': 'agreement',
            'ban': 'legal', 'sanction': 'legal', 'boycott': 'legal',
            'arrest': 'legal', 'jailed': 'legal', 'sentences': 'legal',
            'appoint': 'politics', 'resign': 'politics',

            // ECONOMY
            'inflation': 'economy', 'price': 'economy', 'tax': 'economy',

            // SPORTS
            'won': 'sports', 'lost': 'sports', 'final': 'sports', 'semi-final': 'sports'
        };

        const eventKeywords = Object.keys(EVENT_MAPPINGS);

        const foundEvents = eventKeywords.filter(kw =>
            textToAnalyze.toLowerCase().includes(kw)
        );

        // 3. Normalize Date
        const dateStr = article.pub_date ? new Date(article.pub_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // 4. Build Fingerprint
        // Use the MAPPED concept if available (e.g. "slams" -> "criticism")
        const rawEvent = foundEvents.length > 0 ? foundEvents[0] : 'unknown_event';
        const mainEvent = EVENT_MAPPINGS[rawEvent] || rawEvent;

        const mainPlace = places.length > 0 ? places[0].toLowerCase() : 'unknown_place';
        const mainEntity = people.length > 0 ? people[0] : (orgs.length > 0 ? orgs[0] : 'unknown_entity');

        const fingerprint = `${mainEvent}|${mainPlace}|${mainEntity.toLowerCase()}|${dateStr}`;

        console.log(`[L4:NER] Fingerprint for "${article.title}": ${fingerprint}`);

        // 5. Check Duplicates
        // FIXED: specific check. If event is unknown, do NOT deduplicate at L4. 
        // Let L5 (Vector) handle semantic similarity for vague events.
        const isGeneric = mainEvent === 'unknown_event';

        if (!isGeneric) {
            // Check self-duplicates within this batch
            if (derivedFingerprints.has(fingerprint)) {
                console.log(`[L4:NER] Self-duplicate found via fingerprint: ${fingerprint}`);
                duplicates.push(article);
                continue;
            }

            // Check DB duplicates
            const isSeenInDb = await hasSeenFingerprint(fingerprint);
            if (isSeenInDb) {
                console.log(`[L4:NER] DB duplicate found via fingerprint: ${fingerprint}`);
                duplicates.push(article);
                continue;
            }
        }

        unique.push({ ...article, fingerprint }); // Attach fingerprint for saving later
        if (!isGeneric) {
            derivedFingerprints.add(fingerprint);
        }
    }

    return {
        unique,
        duplicates,
        stats: {
            checked: articles.length,
            duplicatesFound: duplicates.length
        }
    };
}
