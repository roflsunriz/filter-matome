import createConfigTemplate from './vite.ts-css.template.js';

export default createConfigTemplate({
  entry: 'src/cache-data-manager/main.ts',
  name: 'cache-data-manager',
  formats: ['es'],
  exclude: [],
});


