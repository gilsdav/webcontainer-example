const fse = require('fs-extra');

fse.copySync('project', 'public/project', { overwrite: true });
fse.copySync('dist', 'public/dist', { overwrite: true });
fse.copySync('index.html', 'public/index.html', { overwrite: true });
fse.copySync('404.html', 'public/404.html', { overwrite: true });
