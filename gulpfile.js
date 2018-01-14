const fs = require('fs-jetpack');

const path = require('path');
const nunjucks = require('nunjucks');

const del = require('del');
const browserSync = require('browser-sync').create();
const cssnext = require('postcss-cssnext');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

//const webpack = require('webpack');
//const webpackConfig = require('./webpack.config.js');
const rollup = require('rollup').rollup;
const babel = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const rollupUglify = require('rollup-plugin-uglify');
const minifyEs6 = require('uglify-es').minify;
const projectName = path.basename(__dirname);
var cache;
process.env.NODE_ENV = 'dev';

// change NODE_ENV between tasks.
gulp.task('prod', function(done) {
  process.env.NODE_ENV = 'prod';
  done();
});

gulp.task('dev', function(done) {
  process.env.NODE_ENV = 'dev';
  done();
});


/**********Nunjucks渲染环境配置：start*********/
var env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(
    [
      path.resolve(process.cwd(), 'views/html')
    ],
    {
      watch:false,
      noCache: true
    }
  ),
  {autoescape: false}
);

function render(template, context) {
  return new Promise(function(resolve, reject) {
    env.render(template, context, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}


gulp.task('html', async () => {
  var embedded = false;
  const destDir = '.tmp';
  if (process.env.NODE_ENV === 'prod') {
    embedded = true;
  }

  const template = 'show.html';
  const dataPath = 'views/data/show.json';
  const dataForHeader = await fs.readAsync(dataPath,'json');
  const renderResult = await render(template, dataForHeader);
  const destFile = path.resolve(destDir, `show.html`);
  
  await fs.writeAsync(destFile, renderResult);
  browserSync.reload('*.html');

});

gulp.task('styles', function styles() {
  const DEST = '.tmp/styles';

  return gulp.src('client/scss/main.scss')
    .pipe($.changed(DEST))
    .pipe($.plumber())
    .pipe($.sourcemaps.init({loadMaps:true}))
    .pipe($.sass({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['bower_components']
    }).on('error', $.sass.logError))
    .pipe($.postcss([
      cssnext({
        features: {
          colorRgba: false
        }
      })
    ]))
    .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest(DEST))
    .pipe(browserSync.stream({once: true}));
});




gulp.task('script', async () => {
  // TODO:关于rollup需要再认真学习一下

  const bundle = await rollup({
    input:`client/js/main.js`,
    plugins:[
      babel({//这里需要配置文件.babelrc
        exclude:'node_modules/**'
      }),
      nodeResolve({
        jsnext:true,
      })
    // rollupUglify({}, minifyEs6)//压缩es6代码
    ]
  });

  await bundle.write({//返回promise，以便下一步then()
      file: `.tmp/scripts/main.js`,
      format: 'iife',
      sourcemap: true
  });
  
  browserSync.reload();
});



gulp.task('clean', function() {
  return del(['.tmp/**']);
});

gulp.task('serve', gulp.series('html', 'styles', 'script', () => {
  browserSync.init({
    server: {
      baseDir: ['.tmp'],
      index: 'show.html',
      directory: false,
      routes: {
        '/bower_components': 'bower_components'
      }
    },
    port:9000

  });

  gulp.watch(['views/html/*.html', 'views/data/*.json'], gulp.parallel('html'));

  gulp.watch(['client/scss/*.scss'], gulp.parallel('styles'));
  gulp.watch(['client/js/*.js'], gulp.parallel('script'));
}));

