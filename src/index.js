import path from 'path';
import axios from 'axios';
import { promises as fs } from 'fs';

export default (pageURL, outputDir) => {
  const fileName = `${pageURL.replace(/http?s:\/\//i, '').replace(/[^0-9A-z]/gi, '-')}.html`;
  const fullFileName = path.join(outputDir, fileName);
  console.log(fullFileName);
  axios.get(pageURL)
    .then((response) => {
      fs.writeFile(fullFileName, response.data);
    });
};
