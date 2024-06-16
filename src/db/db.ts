import { v4 as uuid } from 'uuid';
import { Entry } from './types';

const API_URL = 'https://ritual-api-production.up.railway.app/'
const DB_NAME = 'ritual';

const DB_VERSION = 1;

const STORE_NAMES = {
    user: 'user',
    entry: 'entry',
    newsletter: 'newsletter'
};

let db: IDBDatabase;

// lol
export function getDB() {
    if (db) {
        return db;
    }

    let request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event: Event) {
        let db: IDBDatabase = (event.target as IDBOpenDBRequest).result;

        for (const name in Object.keys(STORE_NAMES)) {
            if (!db.objectStoreNames.contains(name)) {
                if (name === STORE_NAMES.user) {
                    db.createObjectStore(name, { keyPath: 'email' });
                } else {
                    db.createObjectStore(name, { keyPath: 'id' });
                }
            }
        }

        let userStore = db.transaction([STORE_NAMES.user], 'readwrite').objectStore(STORE_NAMES.user);
        userStore.createIndex('email', 'email', { unique: true });
    };


    request.onsuccess = function(event: Event) {
        db = (event.target as IDBOpenDBRequest).result;
    };

    request.onerror = function(event: Event) {
        console.error('Error opening database:', (event.target as IDBOpenDBRequest).error);
    };

    return db;
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

// doing all this in react was completely unnecessary i think lol

export function logEntry(setterCallback: Function, entry: Entry) {
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

export function getAllEntries(setterCallback: Function) {
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
export function getLatestNewsletter() {
    fetch(API_URL + 'web-newsletter').then((response) => {
        console.log('Response:', response);
        if (response.ok) {
            return response.json();
        }
    }).then(data => {
        const newsletter = {
            id: uuid(),
            createdDate: new Date(),
            content: data.newsletter
        };

        let transaction = db.transaction([STORE_NAMES.newsletter], 'readwrite');
        let objectStore = transaction.objectStore(STORE_NAMES.newsletter);
        let request = objectStore.add(newsletter);

        request.onsuccess = function() {
            console.log('Newsletter saved successfully:', newsletter);
            document.getElementById('newsletter')!.innerText = data.content;
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

export function generateAndSetNewsletter() {
    let transaction: IDBTransaction = db.transaction([STORE_NAMES.newsletter], 'readonly');
    let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAMES.newsletter);

    let index = objectStore.index('id');
    let cursorRequest = index.openCursor(null, 'prev');

    cursorRequest.onsuccess = function(event: Event) {
        let cursor = (event.target as IDBRequest).result;
        if (cursor) {
            const newsletter = cursor.value;
            const now = new Date();
            const lastInterval = new Date(now);
            lastInterval.setDate(now.getDate() - now.getDay());
            lastInterval.setHours(9, 0, 0, 0);

            if (newsletter.createdDate < lastInterval) {
                getLatestNewsletter();
            }
        } else {
            getLatestNewsletter();
        }
    };

    cursorRequest.onerror = function(event: Event) {
        console.error('Error retrieving data:', (event.target as IDBRequest).error);
    };
}

export function userLookup(email: string) {
    let transaction: IDBTransaction = db.transaction([STORE_NAMES.entry], 'readonly');
    let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAMES.entry);
    let index = objectStore.index('email');
    let getRequest = index.get(email);

    getRequest.onsuccess = function(event: Event) {
        let data = getRequest.result;
        if (data) {
            console.log('Data retrieved:', data);
        } else {
            console.log('No data found for the specified username:', email);
        }
    };

    getRequest.onerror = function(event: Event) {
        console.error('Error retrieving data:', (event.target as IDBRequest).error);
    };
}

export function clearObjectStore(storeName: string) {
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


