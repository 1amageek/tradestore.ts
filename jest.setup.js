// Set up Firebase emulator for tests
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.NODE_ENV = 'test';

// Disable Firebase app check for tests
process.env.FIREBASE_APP_CHECK_DEBUG_TOKEN = 'test-debug-token';