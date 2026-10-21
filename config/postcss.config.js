import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import theme from './tailwind.config.js';

export default { plugins: [tailwindcss(theme), autoprefixer()] };
