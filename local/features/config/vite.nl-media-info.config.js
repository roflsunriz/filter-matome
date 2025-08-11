import createConfigTemplate from './vite.html.template.js';

export default createConfigTemplate({
  entry: 'src/nl-media-info/index.html',
  name: 'nl-media-info',
  formats: ['es'],
  exclude: [],
  singleFile: true,
});


