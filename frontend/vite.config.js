import {defineConfig} from 'vite';
export default defineConfig({server:{port:3000,proxy:{'/api/v1':'http://127.0.0.1:4000'}}});
