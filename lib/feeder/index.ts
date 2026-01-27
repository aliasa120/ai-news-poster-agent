/**
 * Feeder Module Exports
 * 
 * Main entry point for the Deep Agents SDK feeder system.
 * Old LangChain-based feeder-agent.ts and title-verifier-agent.ts are deprecated.
 */

// Types
export * from './types';

// Feature Modules
export * from './fuzzy-matcher';
export * from './ner-fingerprint';
export * from './vector-search';




// Permanent storage (still needed)
export {
    isGuidSeen,
    hasSeenGuid,
    saveGuid,
    saveGuids,
    isHashSeen,
    hasSeenHash,
    saveHash,
    saveHashes,
    getAllHashes,
    saveTitle,
    saveTitleFull,
    saveTitles,
    getTitlesForVerification,
    getTitleCountForVerification,
    getTitlesBatch,
    clearAllGuids,
    clearAllHashes,
    clearAllTitles,
    clearAllPermanentData,
    getStorageStats,
} from './permanent-store';

// Source configuration
export {
    MAIN_SOURCES,
    SECONDARY_SOURCES,
    OFFICIAL_SOURCES,
    ALL_SOURCES,
    isTrustedSource,
    buildSiteFilterQuery,
    getAllDomains,
    getMainDomains,
    getSourceByDomain,
} from './sources-config';
