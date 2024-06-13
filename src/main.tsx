import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import './main.css';

const API_URL = 'https://ritual-api-production.up.railway.app/'
const DB_NAME = 'ritual';
const STORE_NAME = 'entry';
const DB_VERSION = 2;

function getDBRequest() {
    return indexedDB.open(DB_NAME, DB_VERSION);
}

interface Entry {
    id: string;
    createdDate: Date;
    content: string;
}

// doing all this in react was completely unnecessary i think lol

function logEntry(setterCallback: Function, entry: Entry) {
    let request = getDBRequest();
    request.onsuccess = function(event: Event) {
        let db = (event.target as IDBOpenDBRequest).result;
        let transaction = db.transaction([STORE_NAME], 'readwrite');
        let objectStore = transaction.objectStore(STORE_NAME);
        let request = objectStore.add(entry);

        request.onsuccess = function() {
            console.log('Data added successfully:', entry);
            setterCallback((entries: Entry[]) => [...entries, entry]);
        };

        request.onerror = function(event: Event) {
            console.error('Error adding data:', (event.target as IDBRequest).error);
        };
    };
}

function getAllEntries(setterCallback: Function) {
    let request = getDBRequest();
    request.onsuccess = function(event: Event) {
        let db = (event.target as IDBOpenDBRequest).result;
        let transaction: IDBTransaction = db.transaction([STORE_NAME], 'readonly');
        let objectStore: IDBObjectStore = transaction.objectStore(STORE_NAME);
        let getRequest = objectStore.getAll();

        getRequest.onsuccess = function(event: Event) {
            let data = getRequest.result;
            if (data) {
                console.log('Data retrieved:', data);
                setterCallback(data);
            } else {
                console.log('No data found for the specified table:', STORE_NAME);
            }
        };

        getRequest.onerror = function(event: Event) {
            console.error('Error retrieving data:', (event.target as IDBRequest).error);
        };
    };
}

function clearObjectStore() {
    let request = getDBRequest();
    request.onsuccess = function(event: Event) {
        let db = (event.target as IDBOpenDBRequest).result;
        let transaction = db.transaction([STORE_NAME], 'readwrite');
        let objectStore = transaction.objectStore(STORE_NAME);
        let clearRequest = objectStore.clear();

        clearRequest.onsuccess = function() {
            console.log('All entries deleted successfully.');
        };

        clearRequest.onerror = function(event: Event) {
            console.error('Error deleting entries:', (event.target as IDBRequest).error);
        };
    };

    request.onerror = function(event: Event) {
        console.error('Error opening database:', (event.target as IDBOpenDBRequest).error);
    };
}

function formatDate(date: Date): string {
    if (date) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear().toString();

        return `${month}/${day}/${year}`;
    } else {
        return '';
    }
}

export function Main() {
    const [entries, setEntries] = useState<Entry[]>([]);

    const initializeDB = () => {
        let request = getDBRequest();

        request.onupgradeneeded = function(event: Event) {
            let db: IDBDatabase = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = function(event: Event) {
            console.log('Database opened successfully:', DB_NAME);
            getAllEntries(setEntries);
        }

        return;
    }

    useEffect(() => {
        if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then((databases) => {
                databases.forEach((dbInfo) => {
                    if (dbInfo.name === DB_NAME) {
                        initializeDB();
                    }
                });
            }).catch((error) => {
                console.error('Error fetching IndexedDB databases:', error);
            });
        } else {
            console.error('IndexedDB or the databases() method is not supported in this browser.');
        }
    }, []);

    const baseButtonStyle = {
        border: 0,
        cursor: 'pointer',
        borderRadius: '0.5rem',
        padding: '0.25rem',
        margin: '0.25rem 0'
    }

    const AddEntry = () => {
        const padding = '0.5rem';

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'end',
                width: '100%',
                height: '15vh'
            }}>
                <textarea id="entry" placeholder="What did you do today?" style={{
                    resize: 'none',
                    width: `calc(100% - 2 * ${padding})`,
                    padding: padding,
                    borderRadius: '5px',
                    height: '100%'
                }}></textarea>
                <button className="logButton" style={baseButtonStyle} onClick={() => {
                    const entryContent = (document.getElementById('entry') as HTMLTextAreaElement).value;
                    if (!entryContent || entryContent.trim() === '') {
                        return;
                    }

                    const entry = {
                        id: uuid(),
                        createdDate: new Date(),
                        content: (document.getElementById('entry') as HTMLTextAreaElement).value
                    };

                    logEntry(setEntries, entry);
                }}>Log</button>
            </div>
        );
    };

    // list sorted in descending order of each logged entry
    const EntryTable = () => {
        const itemMargin = '0.25rem';

        return (
            <div className="entryList" style={{ maxHeight: '35vh', overflowY: 'scroll', padding: 0 }}>
                {entries.sort((a, b) => b.createdDate?.getTime() - a.createdDate?.getTime()).map((entry: Entry) => (
                    <div key={entry.id} style={{
                        width: `calc(100% - 2 * ${itemMargin})`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'start',
                        borderRadius: '5px',
                        boxShadow: '0 2px 5px 0 rgba(0, 0, 0, 0.1)',
                        margin: itemMargin,
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: '100%',
                        }}>
                            <span style={{
                                fontWeight: 'bold',
                                padding: '0.5rem 0 0 0.5rem',
                            }}>{formatDate(entry.createdDate)}</span>
                        </div>
                        <div style={{ margin: '1rem', alignSelf: 'center' }}>{entry.content}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '25vw',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'Helvetica, sans-serif',
        }}>
            <h1>Ritual</h1>
            <AddEntry />
            <EntryTable />
            <button className="logButton" style={baseButtonStyle} onClick={() => {
                clearObjectStore();
                setEntries([]);
            }}>Clear</button>
            <hr style={{ width: '100%' }} />
            <button className="logButton" style={baseButtonStyle}>Get newsletter</button>
        </div >
    );
}
