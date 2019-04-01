import path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';

export default (pageURL, outputDir) => {
  const fileName = pageURL.replace(/https?:\/\//i, '').replace(/[^0-9A-z]/gi, '-').concat('.html');
  const fullFileName = path.resolve(outputDir, fileName);
  console.log(fullFileName);
  return axios.get(pageURL)
    .then((response) => fs.writeFile(fullFileName, response.data));
};
