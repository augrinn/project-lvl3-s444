import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import savePage from '../src';

axios.defaults.adapter = httpAdapter;

const host = 'http://localhost';
const testFilename = 'localhost-test.html';
const dirAssetsName = 'localhost-test_files';
let testDir;
let dirAssetsPath;
let filePath;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test'));
  filePath = path.join(testDir, testFilename);
  dirAssetsPath = path.join(testDir, dirAssetsName);
});

it('Download page without assets', async () => {
  const expected = await fs.readFile(path.join(__dirname, '__fixtures__/pageWithoutAssets.html'), 'utf8');
  nock(host)
    .get('/test')
    .reply(200, expected);

  await savePage(`${host}/test`, testDir);
  const data = await fs.readFile(filePath, 'utf8');
  expect(data).toBe(expected);
});

it('Download page with assets', async () => {
  const expected = await fs.readFile(path.join(__dirname, '__fixtures__/expectedPageWithAssets.html'), 'utf8');
  const pageHtml = await fs.readFile(path.join(__dirname, '__fixtures__/pageWithAssets.html'), 'utf8');
  const filePathStyle = path.join(__dirname, '__fixtures__/assets/style.css');
  const filePathScript = path.join(__dirname, '__fixtures__/assets/script');
  const filePathimage = path.join(__dirname, '__fixtures__/assets/image.png');
  nock(host)
    .get('/test')
    .reply(200, pageHtml)
    .get('/assets/style.css')
    .replyWithFile(200, filePathStyle)
    .get('/assets/script.js')
    .replyWithFile(200, filePathScript)
    .get('/assets/image.png')
    .replyWithFile(200, filePathimage);

  await savePage(`${host}/test`, testDir);
  const data = await fs.readFile(filePath, 'utf8');
  expect(data).toBe(expected);

  const dataStyleExpect = await fs.readFile(filePathStyle, 'utf8');
  const dataStyleResult = await fs.readFile(`${dirAssetsPath}/assets-style.css`, 'utf8');
  expect(dataStyleResult).toBe(dataStyleExpect);

  const dataScriptExpect = await fs.readFile(filePathScript, 'utf8');
  const dataScriptResult = await fs.readFile(`${dirAssetsPath}/assets-script.js`, 'utf8');
  expect(dataScriptResult).toBe(dataScriptExpect);

  const dataImageExpect = await fs.readFile(filePathimage);
  const dataImageResult = await fs.readFile(`${dirAssetsPath}/assets-image.png`);
  expect(dataImageResult).toEqual(dataImageExpect);
});

it('404', async () => {
  nock(host)
    .get('/wrongUrl')
    .reply(404);

  try {
    await savePage(`${host}/wrongUrl`, testDir);
  } catch (e) {
    expect(e.message).toMatch('404');
  }
});
