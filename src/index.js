import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';
import Listr from 'listr';
import { promises as fs } from 'fs';

const log = debug('page-loader');

const assetsTag = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const isLocalAsset = (assetURL) => {
  const assetURLParce = url.parse(assetURL);
  return !assetURLParce.host && assetURLParce.path.substring(0, 2) !== '//';
};

const getNameToSave = name => name
  .replace(/^[/]*/g, '')
  .replace(/[/]*$/g, '')
  .replace(/[^0-9A-z]/g, '-');

const getFileNameToSave = (name) => {
  const { ext } = path.parse(name);
  const nameWithourExt = name.replace(ext, '');
  return getNameToSave(nameWithourExt).concat(ext);
};

const getTasksAssetsSave = (assetsNode, pageURL, dirName) => new Listr(assetsNode.map((element) => {
  const assetHref = element.attribs[assetsTag[element.tagName]];
  const savePath = path.join(dirName, getFileNameToSave(assetHref));
  const assetUrl = url.resolve(pageURL, assetHref);
  return {
    title: `Saving asset ${assetUrl} as ${savePath}`,
    task: () => axios({
      method: 'get',
      url: assetUrl,
      responseType: 'arraybuffer',
    })
      .then(response => fs.writeFile(savePath, response.data))
      .then(() => log(`asset ${assetUrl} saved as ${savePath}`))
      .catch(() => {
        const errorMessage = `error loading asset ${assetUrl}`;
        log(errorMessage);
        throw new Error(errorMessage);
      }),
  };
}), { concurrent: true });

const getAssetsNode = $ => _.uniq(Object.keys(assetsTag).reduce((acc, key) => {
  const filtered = $(key).filter((i, el) => {
    const attrName = assetsTag[key];
    return $(el).attr(attrName) && isLocalAsset($(el).attr(attrName));
  });
  return [...acc, ...filtered.get()];
}, []));

const getTasksReplaceAssetsURL = ($, assetsNode, dirName) => new Listr(assetsNode.map((element) => {
  const oldValue = $(element).attr(assetsTag[element.tagName]);
  const newValue = path.join(dirName, getFileNameToSave(oldValue));
  return {
    title: `Replase ${oldValue} of ${newValue}`,
    task: () => $(element).attr(assetsTag[element.tagName], newValue),
  };
}));

const haveAssets = assetsNode => assetsNode && assetsNode.length !== 0;

export default (pageURL, outputDir) => {
  log(`page URL: ${pageURL}`);
  log(`output dir: ${outputDir}`);
  const { host: hostUrl, path: pathURL } = url.parse(pageURL);
  const nameToSave = getNameToSave(`${hostUrl}${pathURL}`);
  const fileName = path.resolve(outputDir, nameToSave.concat('.html'));
  const dirName = nameToSave.concat('_files');
  const fullDirName = path.resolve(outputDir, dirName);
  log(`fullDirName: ${fullDirName}`);
  const tasks = new Listr([
    {
      title: 'Access output dir',
      task: ctx => fs
        .access(outputDir)
        .then(() => {
          ctx.dirExists = true;
          return Promise.resolve(true);
        }),
    },
    {
      title: 'Get page',
      enabled: ctx => ctx.dirExists,
      task: ctx => axios
        .get(pageURL)
        .then((response) => {
          ctx.$ = cheerio.load(response.data);
          return Promise.resolve(true);
        }),
    },
    {
      title: 'Get assets node',
      enabled: ctx => ctx.$,
      task: (ctx) => {
        ctx.assetsNode = getAssetsNode(ctx.$);
        return Promise.resolve(true);
      },
    },
    {
      title: 'Create directory to save assets',
      enabled: ctx => haveAssets(ctx.assetsNode),
      task: () => fs.access(fullDirName)
        .catch(() => fs.mkdir(fullDirName))
        .then(() => 'Directory exists'),
    },
    {
      title: 'Save assets',
      enabled: ctx => haveAssets(ctx.assetsNode),
      task: ctx => getTasksAssetsSave(ctx.assetsNode, pageURL, fullDirName),
    },
    {
      title: 'Replace assets URL',
      enabled: ctx => haveAssets(ctx.assetsNode),
      task: ctx => getTasksReplaceAssetsURL(ctx.$, ctx.assetsNode, dirName),
    },
    {
      title: 'Save page',
      enabled: ctx => ctx.dirExists && ctx.$,
      task: ctx => fs.writeFile(fileName, ctx.$.html()),
    },
  ]);
  return tasks.run();
};
