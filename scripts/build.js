import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['src/client/new.js'],
  bundle: true,
  format: 'iife',
  outfile: 'client/new.js',
  sourcemap: true,
  minify: true,
}).then(() => {
  console.log('built client/new.js')
}).catch(() => process.exit(1))
