import path from 'path';
import axios from 'axios';
import url from 'url';
import { promises as fs } from 'fs';

export default (pageURL, outputDir) => {
  const { host: hostUrl, path: pathURL } = url.parse(pageURL);
  const nameToSave = `${hostUrl}${pathURL}`.replace(/[^0-9A-z]/gi, '-');
  const fileName = nameToSave.concat('.html');
  const fullFileName = path.resolve(outputDir, fileName);
  return axios.get(pageURL)
    .then(response => fs.writeFile(fullFileName, response.data));
};
