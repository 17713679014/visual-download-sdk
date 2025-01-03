export async function clearIndexedDB(): Promise<void> {
    const dbs = await window.indexedDB.databases();
    const deletePromises = dbs
        .filter(db => typeof db.name === 'string')
        .map(db => new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }));
    
    await Promise.all(deletePromises);
} 