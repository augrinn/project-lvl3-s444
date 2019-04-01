import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import savePage from '../src/';

const host = 'http://test.ru';

axios.defaults.host = host;
axios.defaults.adapter = httpAdapter;

it('Download page', async () => {
  const testData = await fs.readFile(path.join(__dirname, 'fixtures/testData.html'), 'utf8');
  nock(host)
    .get('/')
    .reply(200, testData);
    
  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test'));
  await savePage(host, testDir);
  const testFilename = 'test-ru.html';
  const filePath = path.join(testDir, testFilename);
  const data = await fs.readFile(filePath, 'utf8');
  expect(data).toBe(testData);
});