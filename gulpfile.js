var gulp = require('gulp'),
    glob = require('glob'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    less = require('gulp-less'),
    path = require('path'),
    minifyCSS = require('gulp-minify-css');

var fontPaths = glob.sync('css/**/*.*(otf|eot|svg|ttf|woff|woff2|ttf)').map(function(fontPath){
    var dirName = path.dirname(fontPath),
        baseName = path.basename(fontPath);
    var destName = '';
    var sep = dirName.indexOf('/');
    if(sep>-1){
        destName=dirName.substring(dirName.indexOf('/'));   
    }
    return {
            fontPath:fontPath,
            dirName:dirName,
            baseName:baseName,
            destName:destName
    };
});

var jsPaths = glob.sync('js/*.js').map(function(jsPath){
    var dirName = path.dirname(jsPath),
        baseName = path.basename(jsPath),
        miniName = baseName.substring(0,baseName.lastIndexOf('.'))+'.min.js';
    var destName = '';
    var sep = dirName.indexOf('/');
    if(sep>-1){
        destName=dirName.substring(dirName.indexOf('/'));   
    }
    return {
            jsPath:jsPath,
            dirName:dirName,
            baseName:baseName,
            miniName:miniName,
            destName:destName
    };
});


var cssPaths = glob.sync('css/**/*.css').map(function(cssPath){
    var dirName = path.dirname(cssPath),
        baseName = path.basename(cssPath),
        miniName = baseName.substring(0,baseName.lastIndexOf('.'))+'.min.css';
    var destName = '';
    var sep = dirName.indexOf('/');
    if(sep>-1){
        destName=dirName.substring(dirName.indexOf('/'));   
    }
    return {
            cssPath:cssPath,
            dirName:dirName,
            baseName:baseName,
            miniName:miniName,
            destName:dirName+'/'+miniName
    };
});

gulp.task('fonts',function(){
       fontPaths.forEach(function(path){
               gulp.src(path.fontPath)
                   .pipe(gulp.dest('dist/'+path.dirName));
       });
});

gulp.task('uglify', function() {
  jsPaths.forEach(function(path){
          gulp.src(path.jsPath)
                   .pipe(gulp.dest('dist/js'))
                   .pipe(uglify())
                   .pipe(rename(path.miniName))
                   .pipe(gulp.dest('dist/js'));
  });
});

gulp.task('less',function(){
  return gulp.src('./less/**/*.less')
             .pipe(less({
                paths:[
                  path.join(__dirname,'less','include')
                ]
             }))
             .pipe(gulp.dest('./css'));
});

gulp.task('minifycss',function(){
       cssPaths.forEach(function(path){

               gulp.src(path.cssPath)
                   .pipe(gulp.dest('dist/'+path.dirName))
                   .pipe(minifyCSS({
                      advanced: true,//类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                      compatibility: '*',//类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                      keepBreaks: true//类型：Boolean 默认：false [是否保留换行]  
                   }))
                   .pipe(rename(path.miniName))
                   .pipe(gulp.dest('dist/'+path.dirName));
       });
});

gulp.task('default', ['uglify','less','minifycss','fonts']);
