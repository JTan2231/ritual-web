import { useState, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { STORE_NAMES, API_URL, initDB, logEntry, getAllEntries, clearObjectStore, getLatestNewsletter, formatDate } from './db/db';
import { Entry } from './db/types';
import './main.css';

export function Main() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loggedIn, setLoggedIn] = useState(false);
    const [authToken, setAuthToken] = useState('');

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
        const [isExistingUser, setIsExistingUser] = useState(false);
        const [userChecked, setUserChecked] = useState(false);
        const typingTimeout = useRef<NodeJS.Timeout | null>(null);

        const padding = '0.25rem';

        useEffect(() => {
            return () => {
                if (typingTimeout.current) {
                    clearTimeout(typingTimeout.current);
                }
            };
        });

        const loginCSSCondition = () => userChecked && isExistingUser;
        const newAccountCSSCondition = () => userChecked && !isExistingUser;

        // wrapping this in a function for organizational purposes
        // since its functionality is determined by whether the user exists
        const getLoginOnClick = () => {
            if (isExistingUser) {
                return () => {
                    fetch(API_URL + 'web-login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: (document.getElementById('email') as HTMLInputElement).value,
                            password: (document.getElementById('password') as HTMLInputElement).value
                        })
                    }).then((response) => {
                        if (response.ok) {
                            console.log('successful login');
                            setLoggedIn(true);
                            return response.json();
                        } else {
                            console.error('failed login');
                            return { token: '' };
                        }
                    }).then(data => {
                        if (data.token) {
                            setAuthToken(data.token);
                        }
                    }).catch(error => {
                        console.error('Error logging in:', error);
                    });
                }
            } else {
                return () => {
                    fetch(API_URL + 'web-register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: (document.getElementById('email') as HTMLInputElement).value,
                            password: (document.getElementById('newPassword') as HTMLInputElement).value
                        })
                    }).then((response) => {
                        if (response.ok) {
                            console.log('successful registration');
                            setLoggedIn(true);
                            return response.json();
                        } else {
                            console.error('failed registration');
                            return { token: '' };
                        }
                    }).then(data => {
                        if (data.token) {
                            setAuthToken(data.token);
                        }
                    }).catch(error => {
                        console.error('Error registering:', error);
                    });
                }
            }
        };

        return (
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '40%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '10vw',
                height: '15vh',
                fontFamily: 'monospace'
            }}>
                <h1 style={{ margin: 0 }}>Ritual</h1>
                <p style={{ textAlign: 'center' }}>Welcome! <br />Enter your email to login or create an account.</p>
                <input id="email" type="email" placeholder="Email" style={{
                    width: '100%',
                    margin: '0.25rem 0',
                    padding: padding,
                    border: 0,
                    outline: 0,
                    borderBottom: '1px solid black'
                }} onChange={() => {
                    if (typingTimeout.current) {
                        clearTimeout(typingTimeout.current);
                    }

                    typingTimeout.current = setTimeout(() => {
                        fetch(API_URL + 'user-lookup?username=' + (document.getElementById('email') as HTMLInputElement).value, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                        }).then((response) => response.json()).then(data => {
                            setUserChecked(true);
                            setIsExistingUser(data.exists);
                            if (data.exists) {
                                (document.getElementById('password') as HTMLInputElement).focus();
                            } else {
                                (document.getElementById('newPassword') as HTMLInputElement).focus();
                            }
                        }).catch(error => {
                            console.error('Error checking user:', error);
                        });
                    }, 1000);
                }} />
                <input id="password" type="password" placeholder="Password" tabIndex={loginCSSCondition() ? 0 : -1} style={{
                    width: '100%',
                    margin: '0.25rem 0',
                    padding: loginCSSCondition() ? padding : 0,
                    border: 0,
                    outline: 0,
                    borderBottom: loginCSSCondition() ? '1px solid black' : 0,
                    height: loginCSSCondition() ? '1rem' : 0,
                    opacity: loginCSSCondition() ? 1 : 0,
                    transition: 'all 0.5s'
                }} onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        getLoginOnClick()();
                    }
                }} />
                <input id="newPassword" type="password" placeholder="New password" tabIndex={newAccountCSSCondition() ? 0 : -1} style={{
                    width: '100%',
                    border: 0,
                    outline: 0,
                    margin: '0.25rem 0',
                    padding: newAccountCSSCondition() ? padding : 0,
                    borderBottom: newAccountCSSCondition() ? '1px solid black' : 0,
                    height: newAccountCSSCondition() ? '1rem' : 0,
                    opacity: newAccountCSSCondition() ? 1 : 0,
                    transition: 'all 0.5s'
                }} />
                <input id="confirmPassword" type="password" placeholder="Confirm new password" tabIndex={newAccountCSSCondition() ? 0 : -1} style={{
                    width: '100%',
                    margin: '0.25rem 0',
                    padding: newAccountCSSCondition() ? padding : 0,
                    border: 0,
                    outline: 0,
                    borderBottom: newAccountCSSCondition() ? '1px solid black' : 0,
                    height: newAccountCSSCondition() ? '1rem' : 0,
                    opacity: newAccountCSSCondition() ? 1 : 0,
                    transition: 'all 0.5s'
                }} onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        getLoginOnClick()();
                    }
                }} />
                <button className="logButton" style={{
                    ...baseButtonStyle,
                    display: userChecked ? 'block' : 'none'
                }} onClick={getLoginOnClick()}>{isExistingUser ? 'Login' : 'Create Account'}</button>
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
                for (const name of Object.keys(STORE_NAMES)) {
                    clearObjectStore(name);
                }

                setEntries([]);
            }}>Clear</button>
            <hr style={{ width: '100%' }} />
            <button className="logButton" style={baseButtonStyle} onClick={() => getLatestNewsletter(authToken, entries)}>Get newsletter</button>
            <div id="newsletter"></div>
        </div>
    ) : <LoginPage />
    );
}
