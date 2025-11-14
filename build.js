import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [
    './public/Scripts/Index.js',
    './public/Scripts/callback-handler.js',
    './public/Scripts/ProductsPage.js',
    './public/Scripts/movementsPage.js',
    './public/Scripts/reportsPage.js'
  ],
  bundle: true,
  outdir: './public/dist',
  format: 'esm',
  external: [],
  loader: {
    '.js': 'jsx'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('👀 Watching for changes...');
} else {
  try {
    const result = await esbuild.build(options);
    console.log('✅ Build completed successfully');
    console.log(`📦 Output files:`);
    result.outputFiles?.forEach(file => {
      console.log(`   - ${file.path}`);
    });
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}
