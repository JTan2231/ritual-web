import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { initDB, logEntry, getAllEntries, clearObjectStore } from './db/db';
import { Entry } from './db/types';
import './main.css';

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
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        initDB(() => {
            getAllEntries(setEntries);
        });
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

    const LoginPage = () => {
        const [isExistingUser, setIsExistingUser] = useState(true);

        const padding = '0.25rem';

        return (
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '10vw',
                height: '15vh'
            }}>
                <input id="email" type="email" placeholder="Email" style={{
                    width: `calc(100% - 2 * ${padding})`,
                    padding: padding,
                    borderRadius: '5px',
                    margin: '0.25rem 0'
                }} />
                {(isExistingUser ? (
                    <input id="password" type="password" placeholder="Password" style={{
                        width: `calc(100% - 2 * ${padding})`,
                        padding: padding,
                        borderRadius: '5px',
                        margin: '0.25rem 0'
                    }} />)
                    : null)}
                <button className="logButton" style={baseButtonStyle} onClick={() => {
                    const email = (document.getElementById('email') as HTMLInputElement).value;
                    const password = (document.getElementById('password') as HTMLInputElement).value;

                    if (!email) {
                        return;
                    }


                }}>Login</button>
            </div>
        );
    };

    return (loggedIn ? (
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
                for (const name in Object.keys(STORE_NAMES)) {
                    clearObjectStore(name);
                }

                setEntries([]);
            }}>Clear</button>
            <hr style={{ width: '100%' }} />
            <button className="logButton" style={baseButtonStyle} onClick={() => getLatestNewsletter()}>Get newsletter</button>
            <div id="newsletter"></div>
        </div>
    ) : <LoginPage />
    );
}
