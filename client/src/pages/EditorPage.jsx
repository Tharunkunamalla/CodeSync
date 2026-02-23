import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Avatar from 'react-avatar';
import Editor from '../components/Editor';
import Output from '../components/Output';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const editorRef = useRef(null); // Reference to the actual Monaco editor instance? No, passed down to Editor component which passes it back?
    // Actually, Editor component has the ref internally. We need access to it in Output or lift the state up.
    // Better: Pass a ref from here to Editor, and also pass that ref to Output? 
    // Or just state. Let's use a ref passed to Editor.

    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [isClientsLoading, setIsClientsLoading] = useState(true);

    // We need the editor instance to get value in Output component, 
    // OR we just rely on codeRef.current which is updated on change.
    // But Output needs to send code. codeRef.current is the latest code.
    // However, Output might want to run code. valid point.
    // Let's pass a function to getCode or just use codeRef.
    
    // We need to pass the code to Output to run.
    // Since codeRef.current is updated on change, we can use that.
    
    // But we need the language too. For now hardcode or add selector.
    const [language, setLanguage] = useState('javascript');
    const languageRef = useRef('javascript');
    const [socketInitialized, setSocketInitialized] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isRemoteTyping, setIsRemoteTyping] = useState(false);
    const langMenuRef = useRef(null);
    const remoteTypingTimeoutRef = useRef(null);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const LANGUAGES = [
        "javascript",
        "typescript",
        "python",
        "java",
        "csharp",
        "php",
    ];

    const handleLangChange = (lang) => {
        setLanguage(lang);
        languageRef.current = lang;
        setIsLangOpen(false);
        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: lang,
        });
    };

    useEffect(() => {
        const init = () => {
            socketRef.current = initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                setIsClientsLoading(false);
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    setIsClientsLoading(false);
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                        language: languageRef.current, 
                    });
                }
            );

            // Listening for code change to track remote typing
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ socketId }) => {
                if (socketId !== socketRef.current.id) {
                    setIsRemoteTyping(true);
                    
                    // Optional: Reset after 3 seconds of inactivity if they don't click
                    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                    remoteTypingTimeoutRef.current = setTimeout(() => {
                        setIsRemoteTyping(false);
                    }, 5000);
                }
            });

            // Listening for language change
            socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
                setLanguage(language);
                languageRef.current = language;
            });

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );

            setSocketInitialized(true);
        };
        init();
        return () => {
            if(socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
            }
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    const handleEditorClick = () => {
        setIsRemoteTyping(false);
        if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
    };

    if (!location.state) {
        return <Navigate to="/" state={{ roomId }} />;
    }

    // Filter for unique usernames to display
    const uniqueClients = Array.from(new Set(clients.map(c => c.username)))
    .map(username => clients.find(c => c.username === username));

    const [outputWidth, setOutputWidth] = useState(300);
    const isDragging = useRef(false);

    const startResizing = (mouseDownEvent) => {
        isDragging.current = true;
    };

    const stopResizing = () => {
        isDragging.current = false;
    };

    const resize = (mouseMoveEvent) => {
        if (isDragging.current) {
            // Calculate new width from the right edge of the screen
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 100 && newWidth < window.innerWidth * 0.8) {
                 setOutputWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, []);

    return (
        <div className="mainWrap">
            <div className="aside">
                <button className="mobileMenuBtn" onClick={toggleMobileMenu}>
                    &#9776;
                </button>
                <div className={`asideInner ${isMobileMenuOpen ? 'show' : ''}`}>
                    <button className="closeMenuBtn" onClick={closeMobileMenu}>
                        &times;
                    </button>
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/logo.png"
                            alt="logo"
                        />
                    </div>
                    <div className="currentUserSection">
                        <div className="currentUserInfo">
                            <Avatar 
                                name={location.state?.username} 
                                size={40} 
                                round="12px" 
                                color="#4aed88"
                                fgColor="#000"
                            />
                            <div className="userDetails">
                                <span className="userLabel">Logged in as</span>
                                <span className="userNameText">{location.state?.username}</span>
                            </div>
                        </div>
                    </div>
                    {/* Show connected status only when others are present */}
                    {isClientsLoading ? (
                        <div className="loader-container">
                            <div className="loader"></div>
                        </div>
                    ) : (
                        <>
                            {uniqueClients.length > 0 && (
                                <>
                                    <h3>Connected</h3>
                                    <div className="clientsList">
                                        {uniqueClients.map((client) => (
                                            <Client
                                                key={client.socketId}
                                                username={client.username}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                            {uniqueClients.length <= 1 && (
                                <div className="waitingForInfo">
                                    <div className="loader" style={{width: '20px', height: '20px', borderWidth: '2px', marginBottom: '10px'}}></div>
                                    <p>Waiting for others to join...</p>
                                </div>
                            )}
                        </>
                    )}
                    <button className="btn copyBtn" onClick={copyRoomId}>
                        Copy ROOM ID
                    </button>
                </div>
                {isMobileMenuOpen && <div className="mobileMenuOverlay" onClick={() => setIsMobileMenuOpen(false)}></div>}
                
                <div className="asideControls">
                    <div className="languageSelector" ref={langMenuRef}>
                        <div className="languageDropdown">
                            <div 
                                className="dropdownBtn" 
                                onClick={() => setIsLangOpen(!isLangOpen)}
                            >
                                {language.toUpperCase()}
                                <span className={`arrow ${isLangOpen ? 'open' : ''}`}>▼</span>
                            </div>
                            {isLangOpen && (
                                <div className="dropdownMenu">
                                    {LANGUAGES.map((lang) => (
                                        <div 
                                            key={lang} 
                                            className={`dropdownItem ${lang === language ? 'active' : ''}`}
                                            onClick={() => handleLangChange(lang)}
                                        >
                                            {lang.toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="btn leaveBtn" onClick={leaveRoom}>
                        Leave
                    </button>
                    <button 
                        className="btn aboutBtn" 
                        onClick={() => setIsAboutOpen(true)}
                        style={{ marginTop: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                        About & Rules
                    </button>
                </div>
            </div>

            {/* About Modal */}
            {isAboutOpen && (
                <div className="aboutModalOverlay" onClick={() => setIsAboutOpen(false)}>
                    <div className="aboutModal" onClick={(e) => e.stopPropagation()}>
                        <div className="smokyBackground"></div>
                        <button className="closeAboutBtn" onClick={() => setIsAboutOpen(false)}>&times;</button>
                        <div className="aboutContent">
                            <h2 className="aboutTitle">About Code Sync</h2>
                            <p className="aboutDesc">
                                A real-time collaborative code editor designed for pair programming and technical interviews. 
                                Experience seamless synchronization with high-performance execution.
                            </p>
                            
                            <div className="rulesSection">
                                <h3 className="sectionTitle">Collaboration Rules</h3>
                                <ul className="rulesList">
                                    <li className="ruleItem">
                                        <div className="ruleIcon">⌨️</div>
                                        <div className="ruleText">
                                            <strong>Simultaneous Editing:</strong> Multiple users can type at once. Remote cursors show you exactly where others are working.
                                        </div>
                                    </li>
                                    <li className="ruleItem">
                                        <div className="ruleIcon">🔒</div>
                                        <div className="ruleText">
                                            <strong>Run Protection:</strong> If a collaborator is typing, the "Run Code" button will be locked for others to prevent executing incomplete logic.
                                        </div>
                                    </li>
                                    <li className="ruleItem">
                                        <div className="ruleIcon">🖱️</div>
                                        <div className="ruleText">
                                            <strong>Activate Run:</strong> To unlock the "Run Code" button while someone is typing, you must <strong>click anywhere inside the editor</strong> to confirm you are focused on the current state.
                                        </div>
                                    </li>
                                    <li className="ruleItem">
                                        <div className="ruleIcon">🚀</div>
                                        <div className="ruleText">
                                            <strong>Instant Broadcast:</strong> Language changes and code updates are broadcasted to all room participants immediately.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            
                            <div className="aboutFooter">
                                <span className="versionTag">v1.2.0 Stable</span>
                                <button className="btn gotItBtn" onClick={() => setIsAboutOpen(false)}>Got It!</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="editorWrap">
                <div className="editorContainer" style={{ flex: 1, overflow: 'hidden' }}>
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code, cursor) => {
                            codeRef.current = code;
                            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                                roomId,
                                code,
                                cursor,
                            });
                        }}
                        onEditorClick={handleEditorClick}
                        language={language}
                    />
                </div>
                <div
                    className="resizer"
                    onMouseDown={startResizing}
                />
                <div className="outputContainer" style={{ width: outputWidth, overflow: 'hidden' }}>
                    <Output 
                        editorRef={{ current: { getValue: () => codeRef.current } }} 
                        language={language}
                        isRemoteTyping={isRemoteTyping}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
