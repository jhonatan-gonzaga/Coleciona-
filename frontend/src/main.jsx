import React from 'react';import{createRoot}from'react-dom/client';import WebApp from './WebApp';import '@fontsource-variable/ibm-plex-sans';import '@fontsource-variable/newsreader';import './style.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><WebApp/></React.StrictMode>);
