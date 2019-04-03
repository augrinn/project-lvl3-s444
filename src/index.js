import path from 'path';
import axios from 'axios';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';
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

const saveAssets = (assetsNode, pageURL, dirName) => {
  if (assetsNode.length === 0) {
    return Promise.resolve(true);
  }
  return fs.access(dirName)
    .catch(() => fs.mkdir(dirName))
    .then(() => {
      const promises = assetsNode.map((element) => {
        const assetHref = element.attribs[assetsTag[element.tagName]];
        const savePath = path.join(dirName, getFileNameToSave(assetHref));
        const assetUrl = url.resolve(pageURL, assetHref);
        log(`asset ${assetUrl} saved as ${savePath}`);
        return axios({
          method: 'get',
          url: assetUrl,
          responseType: 'arraybuffer',
        })
          .then(response => fs.writeFile(savePath, response.data));
      });
      return Promise.all(promises);
    });
};

const saveAssetsNodeAndModifyHtml = (html, pageURL, dirName, fullDirName) => {
  const $ = cheerio.load(html);
  const assetsNode = _.uniq(Object.keys(assetsTag).reduce((acc, key) => {
    const filtered = $(key).filter((i, el) => {
      const attrName = assetsTag[key];
      return $(el).attr(attrName) && isLocalAsset($(el).attr(attrName));
    });
    return [...acc, ...filtered.get()];
  }, []));
  return saveAssets(assetsNode, pageURL, fullDirName)
    .then(() => assetsNode.forEach((element) => {
      const oldValue = $(element).attr(assetsTag[element.tagName]);
      const newValue = path.join(dirName, getFileNameToSave(oldValue));
      $(element).attr(assetsTag[element.tagName], newValue);
    }))
    .then(() => $.html());
};

export default (pageURL, outputDir) => {
  log(`page URL: ${pageURL}`);
  log(`output dir: ${outputDir}`);
  const { host: hostUrl, path: pathURL } = url.parse(pageURL);
  const nameToSave = getNameToSave(`${hostUrl}${pathURL}`);
  const fileName = path.resolve(outputDir, nameToSave.concat('.html'));
  const dirName = nameToSave.concat('_files');
  const fullDirName = path.resolve(outputDir, dirName);
  return axios.get(pageURL)
    .then(response => saveAssetsNodeAndModifyHtml(response.data, pageURL, dirName, fullDirName))
    .then(html => fs.writeFile(fileName, html));
};
