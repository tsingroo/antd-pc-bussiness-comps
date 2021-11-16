const ShellJs = require('shelljs');
var Glob = require("glob");

function compile() {
  // 1.清理lib目录
  // 2.编译ts
  // 3.复制样式文件到目标目录，并保留目录结构
  const SOURCE_DIR = './src/';
  const DEST_DIR = './lib/';

  ShellJs.rm('-rf', DEST_DIR);
  ShellJs.exec('tsc -p .');
  Glob('**/*.scss', { cwd: SOURCE_DIR }, (er, files) => {
    // filePath为src文件夹下每一个scss文件的路径
    files.forEach((filePath) => {
      ShellJs.cp( SOURCE_DIR + filePath, DEST_DIR + filePath);
    });
  });
}

compile();
