// Gulp Dependencies
'use strict'
process.argv.push('--silent');
const gulp = require('gulp');
const concat = require('gulp-concat');
const gutil = require('gulp-util');
const gif = require('gulp-if');
const args = require('yargs').argv;
const runSequence = require('run-sequence');
const sourcemaps = require('gulp-sourcemaps');
const chalk = require('chalk');

// Html Dependencies
const htmlmin = require('gulp-htmlmin');

// Style Dependencies
const less = require('gulp-less');
const cleancss = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');

// Javascript Dependencies
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const insert = require('gulp-insert');
const eslint = require('gulp-eslint');
const stripDebug = require('gulp-strip-debug');
const babelify = require('babelify');

// LiveReload Dependencies
// const browserSync = require("browser-sync").create();
const livereload = require('gulp-livereload');
let live = 'livereload()';

gulp.task('default', () => {
  runSequence('livereload');
  runSequence('watch');
});

gulp.task('livereload', () => {
  live = 'livereload()';
  livereload.listen();
});

// gulp.task('browser-sync', () => {
//   live = 'browserSync.stream()';
//   browserSync.init({
//     proxy: "dev2.yle.fi"
//   });
// });

gulp.task('watch', () => {
  // Watch Html.
  gulp.watch('index.html', (file) => {
    runSequence('build-html');
  }).on('error', map_error);

  // Watch CSS.
  gulp.watch('css/styles.less', (file) => {
    runSequence('build-css');
  }).on('error', map_error);

  // Watch JS.
  gulp.watch('js/script.js', (file) => {
    runSequence('build-js');
  }).on('error', map_error);
});

// Build all.
gulp.task('build', () => {
  runSequence('build-html');
  runSequence('build-css');
  runSequence('build-js');
});

// Build Html.
gulp.task('build-html', () => {
  if (args.env === 'prod') {
    gulp.src(['./index.html'])
      .pipe(htmlmin({
        collapseWhitespace:true
      }))
      .pipe(gulp.dest('./public'))
      .pipe(eval(live));
  }
  else {
    gulp.src(['./index.html'])
      .pipe(gulp.dest('./public'))
      .pipe(eval(live));
  }
  gulp.src(['./index.html'])
    .pipe(insert.prepend('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" /><script src="//cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js" type="text/javascript"></script><link href="../css/styles.min.css" rel="stylesheet" type="text/css"></head><body>'))
    .pipe(insert.append('</body><script src="../js/script.min.js" type="text/javascript"></script></html>'))
    .pipe(gulp.dest('./public/standalone'));
  return true;
});

// Build CSS.
gulp.task('build-css', () => {
  if (args.env === 'prod') {
    return gulp.src(['./css/styles.less'])
      .pipe(less()).on('error', map_error)
      .pipe(sourcemaps.init())
      .pipe(autoprefixer({
        browsers:['last 2 versions'],
        cascade:false
      }))
      .pipe(cleancss())
      .pipe(concat('styles.min.css'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('./public/css'))
      .pipe(gif('*.css', eval(live)));
  }
  else {
    return gulp.src(['./css/styles.less'])
      .pipe(less()).on('error', map_error)
      .pipe(sourcemaps.init())
      .pipe(cleancss())
      .pipe(concat('styles.min.css'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('./public/css'))
      .pipe(gif('*.css', eval(live)));
  }
});

// Build JS.
gulp.task('build-js', ['lint'], () => {
  const b = browserify({
    entries:'./js/script.js',
    insertGlobals:false,
    debug:false,
    transform:[babelify.configure({
      presets:['es2015'],
      sourceMaps:true
    })]
  });

  if (args.env === 'prod') {
    return b.bundle()
      .on('error', map_error)
      .pipe(source('script.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init())
      .pipe(uglify({
        compress:true
      }))
      .pipe(stripDebug())
      .pipe(concat('script.min.js'))
      .pipe(insert.wrap('(function () { var define = undefined;','})();'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('./public/js'))
      .pipe(gif('*.js', eval(live)));
  }
  else {
    return b.bundle()
      .on('error', map_error)
      .pipe(source('script.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init())
      .pipe(concat('script.min.js'))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('./public/js'))
      .pipe(gif('*.js', eval(live)));
  }
});

// Linting.
gulp.task('lint', () => {
  return gulp.src('./js/script.js')
    .on('error', map_error)
    .pipe(eslint({configFile: 'eslintrc.json'}))
    .pipe(eslint.format())
    // .pipe(eslint.failAfterError());
});

// Error handling.
function map_error (err) {
  if (err.fileName) {
    // regular error
    gutil.log(chalk.red(err.name)
      + ': '
      + chalk.yellow(err.fileName.replace(__dirname + '/js/', ''))
      + ': '
      + 'Line '
      + chalk.magenta(err.lineNumber)
      + ' & '
      + 'Column '
      + chalk.magenta(err.columnNumber || err.column)
      + ': '
      + chalk.blue(err.description))
  }
  else {
    // browserify error..
    gutil.log(chalk.red(err.name)
      + ': '
      + chalk.yellow(err.message))
  }
  this.emit('end');
}