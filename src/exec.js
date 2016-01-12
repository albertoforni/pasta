let when = require('when');
let path = require('path');

let Utils = require('./utils');
let Git = require('./git');
let { Transform } = require('./transform');
let { logger } = require('./logger');

const SCRIPT = `npm install && git init && git add --all && git commit -m "Create scaffold project"`;

class Exec {
  _copy(data) {
    let { from, to, transform, outputFileName, excludeTransformPath } = data;
    let flow = [];

    if (Utils.isRepo(from)) {
      logger.info(`Cloning ${from} to ${to}`);

      flow = [
        Git.clone,
        Git.cleanGitFolder,
        Utils.transformInPlace,
      ];
    } else {
      logger.info(`Copying ${from} to ${to}`);

      flow = [
        Utils.ls,
        Utils.filterFiles,
        Utils.copyAndTransform,
      ];
    }

    return flow.reduce(function (soFar, f) {
      return soFar.then(f);
    }, when({ from, to, transform, outputFileName, excludeTransformPath }));
  }

  new([name, from, destFolder]) {
    let to = path.join(process.cwd(), destFolder || name);

    let execTrain = {
      from,
      to,
      transform: new Transform({
        appName: name,
      }),
      excludeTransformPath: new RegExp(path.join(to, '/templates/\S*'), 'i'),
    };

    logger.info('Start a new project');
    logger.verbose(`with the following configurations:\n${JSON.stringify(execTrain, null, 2)}`);

    return this._copy(execTrain)
    .then(() => {
      logger.verbose(`Change current working directory to: "${to}"`);
      process.chdir(to);
      Utils.executeScript(SCRIPT);
    });
  }

  create([type, name]) {
    // TODO use a plural library
    let destFolder = path.join(process.cwd(), 'src', type + 's');

    let execTrain = {
      from: path.join(process.cwd(), 'templates', 'create', type),
      to: destFolder,
      transform: new Transform({
        componentName: name,
      }),
      outputFileName: name,
    };

    logger.info(`Create the "${type}" named: "${name}"`);
    logger.verbose(`with the following configurations:\n${JSON.stringify(execTrain, null, 2)}`);

    return Utils.checkFolderExists(execTrain.from)
    .then(() => {
      return this._copy(execTrain);
    }).catch((err) => {
      logger.info(err);
    });
  }
}

module.exports = new Exec();
