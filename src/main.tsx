import { useState, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { STORE_NAMES, API_URL, initDB, logEntry, getAllEntries, generateAndSetNewsletter, getNewsletterIfExists, formatDate } from './db/db';
import { Entry, Newsletter, JSONifiedHTML } from './db/types';
import './main.css';

export function Main() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loadingNewsletter, setLoadingNewsletter] = useState(false);
    const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [authToken, setAuthToken] = useState('');

    useEffect(() => {
        setTimeout(() => {
            document.body.style.transition = 'background-color 5s';
        }, 500);

        document.body.style.backgroundColor = 'white';
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
                <button className="logButton" style={{ ...baseButtonStyle, margin: '0.5rem 0 1rem 0' }} onClick={() => {
                    const entryContent = (document.getElementById('entry') as HTMLTextAreaElement).value;
                    if (!entryContent || entryContent.trim() === '') {
                        return;
                    }

                    logEntry(setEntries, {
                        id: uuid(),
                        content: entryContent,
                        createdDate: new Date()
                    });
                }}>Log</button>
            </div>
        );
    };

    // list sorted in descending order of each logged entry
    const EntryTable = () => {
        const itemMargin = '0.25rem';

        return (
            <div className="entryList" style={{ overflowY: 'scroll', padding: 0 }}>
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

    const Loading = ({ complete = false }) => {
        const [dots, setDots] = useState(1);

        useEffect(() => {
            const interval = setInterval(() => {
                setDots((prevDots) => (prevDots % 3) + 1);
            }, 400);

            return () => clearInterval(interval);
        }, [complete]);

        return (
            <p style={{ textAlign: 'center' }}>{complete ? '' : 'Asking GPT' + '.'.repeat(dots)}</p>
        );
    }

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

        const setError = (error: string) => {
            const loginError = document.getElementById('loginError')!;
            loginError.innerText = error;
            loginError.style.opacity = '1';
        };

        const clearError = () => {
            const loginError = document.getElementById('loginError')!;
            loginError.innerText = '';
            loginError.style.opacity = '0';
        }

        // wrapping this in a function for organizational purposes
        // since its functionality is determined by whether the user exists
        const getLoginOnClick = () => {
            const loginCheck = (response: Response) => {
                if (response.ok) {
                    setLoggedIn(true);
                    return response.json();
                } else {
                    return { token: '' };
                }
            };

            const loginFlow = (endpoint: string, email: string, password: string) => {
                fetch(API_URL + endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                    })
                }).then((response) => {
                    return loginCheck(response);
                }).then(data => {
                    if (data.token) {
                        setAuthToken(data.token);

                        initDB(() => {
                            getAllEntries(setEntries);
                            setLoadingNewsletter(true);
                            getNewsletterIfExists((nl: Newsletter) => {
                                setLoadingNewsletter(false);

                                if (nl) {
                                    setNewsletter(nl);
                                    document.body.style.backgroundColor = nl.color;
                                }
                            });
                        });
                    }
                }).catch(error => {
                    console.error('Error logging in:', error);
                });
            };

            const email = () => (document.getElementById('email') as HTMLInputElement).value;
            const password = () => (document.getElementById('password') as HTMLInputElement).value;
            const newPassword = () => (document.getElementById('newPassword') as HTMLInputElement).value;
            const confirmPassword = () => (document.getElementById('confirmPassword') as HTMLInputElement).value;

            if (isExistingUser) {
                return () => {
                    loginFlow('web-login', email(), password());
                }
            } else {
                return () => {
                    if (newPassword() !== confirmPassword()) {
                        setError('Passwords do not match');
                        return;
                    }

                    loginFlow('web-register', email(), newPassword());
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
                            clearError();
                            setUserChecked(true);
                            setIsExistingUser(data.exists);
                            if (data.exists) {
                                (document.getElementById('password') as HTMLInputElement).focus();
                            } else {
                                (document.getElementById('newPassword') as HTMLInputElement).focus();
                            }
                        }).catch(error => {
                            console.error('Error checking user:', error);
                            setError('Error checking user');
                        });
                    }, 500);
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
                <div id="loginError" style={{ fontSize: '0.8rem', color: 'red', opacity: 0, transition: '0.5s opacity' }}></div>
            </div>
        );
    };

    const NewsletterDisplay = () => {
        useEffect(() => {
            if (!newsletter) return;

            // this feels so needlessly complicated
            // i'm sure there's a far better way of doing all this
            //
            // DFS--traverses the JSONifiedHTML tree and replicates it incrementally in the DOM
            // individual words within text nodes are treated as separate text-fragment nodes

            const splitText = (text: string) => {
                return text.split(' ').map((word) => ({
                    tag: 'text-fragment',
                    text: word,
                    attributes: {},
                    children: []
                } as JSONifiedHTML)).reverse();
            }

            let current: JSONifiedHTML = newsletter.html!;
            let depth = 0;
            let lastRoot: HTMLElement | null = null;
            let stack: { node: JSONifiedHTML, depth: number, parent: HTMLElement | null }[] = [{ node: current, depth, parent: null }];
            const interval = setInterval(() => {
                if (stack.length === 0) {
                    clearInterval(interval);
                    return;
                }

                const top = stack.pop()!;
                current = top.node;
                depth = top.depth;

                if (current.tag === 'text' && current.text) {
                    for (const fragment of splitText(current.text)) {
                        stack.push({ node: fragment, depth: depth + 1, parent: top.parent });
                    }
                } else if (current.tag === 'text-fragment') {
                    if (top.parent) {
                        top.parent.innerHTML += ' ' + current.text;
                    } else {
                        document.getElementById('newsletterDisplay')!.innerHTML += ' ' + current.text;
                    }
                } else {
                    if (current.tag !== '[document]') {
                        const newNode = document.createElement(current.tag);
                        if (current.attributes) {
                            for (const [key, value] of Object.entries(current.attributes)) {
                                newNode.setAttribute(key, value);
                            }
                        }

                        if (top.parent) {
                            top.parent.appendChild(newNode);
                        } else {
                            document.getElementById('newsletterDisplay')!.appendChild(newNode);
                        }

                        lastRoot = newNode;
                    }

                    for (const child of current.children.reverse()) {
                        stack.push({ node: child, depth: depth + 1, parent: lastRoot });
                    }
                }
            }, 10);

            return () => {
                clearInterval(interval);
            };
        }, []);

        return (
            <div id="newsletterDisplay" style={{
                minHeight: '100vh',
                width: '100%',
                boxShadow: '0 2px 5px 0 rgba(0, 0, 0, 0.1)',
                marginBottom: '3rem',
            }}></div>
        );
    }

    const GetNewsletterButton = () => {
        const latestSunday = new Date();
        latestSunday.setDate(latestSunday.getDate() - (latestSunday.getDay() + 1) % 7);
        const newsletterDate = newsletter ? new Date(newsletter.createdDate) : new Date(0);

        const entriesCheck = () => {
            if (entries.length === 0) {
                document.getElementById('newsletterError')!.innerText = "Don't you have something you'd like to say?";
                return false;
            }

            document.getElementById('newsletterError')!.innerText = '';

            return true;
        }

        if (newsletterDate >= latestSunday) {
            return (
                <button className="logButton" style={baseButtonStyle} onClick={() => {
                    if (!entriesCheck()) {
                        return;
                    }

                    setLoadingNewsletter(true);
                    getNewsletterIfExists((nl: Newsletter) => {
                        setNewsletter(nl);
                        setLoadingNewsletter(false);

                        document.body.style.backgroundColor = nl.color;
                    })
                }}>View last newsletter</button>
            );
        } else {
            return (
                <button className="logButton shining-element" style={baseButtonStyle} onClick={() => {
                    if (!entriesCheck()) {
                        return;
                    }

                    setLoadingNewsletter(true);
                    generateAndSetNewsletter(authToken, entries, (nl: Newsletter) => {
                        setNewsletter(nl);
                        setLoadingNewsletter(false);

                        document.body.style.backgroundColor = nl.color;
                    })
                }
                }>Generate latest newsletter</button>
            );
        }
    }

    return (loggedIn ? (
        <div id="mainBody" style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '50vw',
            top: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                alignSelf: 'start',
                width: '50%',
                marginBottom: '2rem',
                marginRight: '1rem'
            }}>
                <h1>Ritual</h1>
                <AddEntry />
                <EntryTable />
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                alignSelf: 'start',
                width: '50%',
                margin: '2rem 0',
                marginLeft: '1rem'
            }}>
                <GetNewsletterButton />
                <div style={{ width: '100%' }}>
                    <div id="newsletterError" style={{ color: 'red', textAlign: 'center' }}></div>
                    <Loading complete={!loadingNewsletter} />
                    <NewsletterDisplay />
                </div>
            </div>
        </div>
    ) : <LoginPage />
    );
}
