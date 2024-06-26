import { v4 as uuid } from 'uuid';
import { Entry, Newsletter } from './types';

export const API_URL = 'https://ritual-api-production.up.railway.app/';
const DB_NAME = 'ritual';

const DB_VERSION = 5;

export const STORE_NAMES = {
    user: 'user',
    entry: 'entry',
    newsletter: 'newsletter'
};

let _db: IDBDatabase;

export function formatDate(date: Date): string {
    if (date) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear().toString();

        return `${month}/${day}/${year}`;
    } else {
        return '';
    }
}

export function getDB() {
    return new Promise<IDBDatabase>((resolve, _) => {
        if (_db) {
            resolve(_db);
        }

        let request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event: Event) {
            console.log('upgrading to version', DB_VERSION)
            const eventRequest = event.target as IDBOpenDBRequest;
            let db: IDBDatabase = eventRequest.result;

            for (const name of Object.keys(STORE_NAMES)) {
                if (!db.objectStoreNames.contains(name)) {
                    if (name === STORE_NAMES.user) {
                        db.createObjectStore(name, { keyPath: 'email' });
                    } else {
                        db.createObjectStore(name, { keyPath: 'id' });
                    }
                }
            }

            const userStore = eventRequest.transaction!.objectStore(STORE_NAMES.user);
            if (!userStore.indexNames.contains('email')) {
                userStore.createIndex('email', 'email', { unique: true });
            }

            const newsletterStore = eventRequest.transaction!.objectStore(STORE_NAMES.newsletter);
            if (!newsletterStore.indexNames.contains('newsletter')) {
                newsletterStore.createIndex('newsletter', 'id', { unique: false });
            }
        };


        request.onsuccess = function(event: Event) {
            _db = (event.target as IDBOpenDBRequest).result;
            resolve(_db);
        };

        request.onerror = function(event: Event) {
            console.error('Error opening database:', (event.target as IDBOpenDBRequest).error);
        };
    });
}

export function initDB(initializationCallback: Function) {
    if (window.indexedDB && indexedDB.databases) {
        indexedDB.databases().then((databases) => {
            databases.forEach((dbInfo) => {
                if (dbInfo.name === DB_NAME) {
                    initializationCallback();
                }
            });
        }).catch((error) => {
            console.error('Error fetching IndexedDB databases:', error);
        });
    } else {
        console.error('IndexedDB or the databases() method is not supported in this browser.');
    }

}

export async function logEntry(setterCallback: Function, entry: Entry) {
    const db = await getDB();
    let transaction = db.transaction([STORE_NAMES.entry], 'readwrite');
    let objectStore = transaction.objectStore(STORE_NAMES.entry);
    let request = objectStore.add(entry);

    request.onsuccess = function() {
        console.log('Data added successfully:', entry);
        setterCallback((entries: Entry[]) => [...entries, entry]);
    };

    request.onerror = function(event: Event) {
        console.error('Error adding data:', (event.target as IDBRequest).error);
    };
}

export async function getAllEntries(setterCallback: Function) {
    const db = await getDB();
    let transaction: IDBTransaction = db.transaction([STORE_NAMES.entry], 'readonly');
    let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAMES.entry);
    let getRequest = objectStore.getAll();

    getRequest.onsuccess = function(event: Event) {
        let data = getRequest.result;
        if (data) {
            console.log('Data retrieved:', data);
            setterCallback(data);
        } else {
            console.log('No data found for the specified table:', STORE_NAMES.entry);
        }
    };

    getRequest.onerror = function(event: Event) {
        console.error('Error retrieving data:', (event.target as IDBRequest).error);
    };
}

// this performs the API call to actually generate the newest letter
// 
// this pattern of passing a setter callback to everything feels a little gross
export async function getLatestNewsletter(token: string, entries: Entry[], setterCallback: Function) {
    console.log('generating new newsletter...');
    fetch(API_URL + 'web-newsletter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            entries: entries.map(entry => ({
                ...entry,
                createdDate: formatDate(entry.createdDate)
            }))
        })
    }).then((response) => {
        console.log('Response:', response);
        if (response.ok) {
            return response.json();
        }
    }).then(async data => {
        const newsletter = {
            id: uuid(),
            createdDate: new Date(),
            content: data.newsletter,
            color: data.color,
            html: data.jsonified_html
        } as Newsletter;

        const db = await getDB();
        let transaction = db.transaction([STORE_NAMES.newsletter], 'readwrite');
        let objectStore = transaction.objectStore(STORE_NAMES.newsletter);
        let request = objectStore.add(newsletter);

        request.onsuccess = function() {
            console.log('Newsletter saved successfully:', newsletter);
            setterCallback(newsletter);
        };

        request.onerror = function(event: Event) {
            console.error('Error adding data:', (event.target as IDBRequest).error);
        };

        request.onerror = function(event: Event) {
            console.error('Error opening database:', (event.target as IDBOpenDBRequest).error);
        };
    }).catch(error => {
        console.error('Error fetching newsletter:', error);
    });
}

export async function generateAndSetNewsletter(token: string, entries: Entry[], setterCallback: Function) {
    const db = await getDB();
    let transaction: IDBTransaction = db.transaction([STORE_NAMES.newsletter], 'readonly');
    let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAMES.newsletter);

    let index = objectStore.index('newsletter');
    let cursorRequest = index.openCursor(null, 'prev');

    cursorRequest.onsuccess = function(event: Event) {
        let cursor = (event.target as IDBRequest).result;
        if (cursor) {
            const newsletter = cursor.value as Newsletter;
            const now = new Date();
            const lastInterval = new Date(now);
            lastInterval.setDate(now.getDate() - now.getDay());
            lastInterval.setHours(9, 0, 0, 0);

            if (newsletter.createdDate < lastInterval) {
                getLatestNewsletter(token, entries, setterCallback);
            } else {
                setterCallback(newsletter);
            }
        } else {
            getLatestNewsletter(token, entries, setterCallback);
        }
    };

    cursorRequest.onerror = function(event: Event) {
        console.error('Error retrieving data:', (event.target as IDBRequest).error);
    };
}

export async function getNewsletterIfExists(setterCallback: Function) {
    const db = await getDB();
    let transaction: IDBTransaction = db.transaction([STORE_NAMES.newsletter], 'readonly');
    let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAMES.newsletter);

    let index = objectStore.index('newsletter');
    let cursorRequest = index.openCursor(null, 'prev');

    cursorRequest.onsuccess = function(event: Event) {
        let cursor = (event.target as IDBRequest).result;
        if (cursor) {
            const newsletter = cursor.value as Newsletter;

            setterCallback(newsletter);
        } else {
            setterCallback(null);
        }
    };

    cursorRequest.onerror = function(event: Event) {
        console.error('Error retrieving data:', (event.target as IDBRequest).error);
    };
}

export async function clearObjectStore(storeName: string) {
    const db = await getDB();
    let transaction = db.transaction([storeName], 'readwrite');
    let objectStore = transaction.objectStore(storeName);
    let clearRequest = objectStore.clear();

    clearRequest.onsuccess = function() {
        console.log('All entries deleted successfully.');
    };

    clearRequest.onerror = function(event: Event) {
        console.error('Error deleting entries:', (event.target as IDBRequest).error);
    };
}


