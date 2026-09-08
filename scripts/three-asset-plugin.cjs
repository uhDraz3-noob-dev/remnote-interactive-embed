// Build a separate classic-script asset, not part of any RemNote widget bundle.
const path = require('node:path');
const { createRequire } = require('node:module');
const esbuild = createRequire(require.resolve('esbuild-loader'))('esbuild');
module.exports = class ThreeAssetPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ThreeAssetPlugin', compilation => {
      compilation.hooks.processAssets.tapPromise({name:'ThreeAssetPlugin',stage:compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL}, async () => {
        const result = await esbuild.build({
          absWorkingDir:compiler.context,entryPoints:['src/three/engine.js'],bundle:true,write:false,
          platform:'browser',format:'iife',target:'es2020',minify:true,metafile:true,legalComments:'inline'
        });
        Object.keys(result.metafile.inputs).forEach(file => compilation.fileDependencies.add(path.resolve(compiler.context,file)));
        compilation.emitAsset('interactive-3d.js',new compiler.webpack.sources.RawSource(Buffer.from(result.outputFiles[0].contents)));
      });
    });
  }
};
