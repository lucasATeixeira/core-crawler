const p = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');
const { v4: uuidv4 } = require('uuid');

async function handleAnalysis({page, url}) {
  await page.goto(`https://${url}`, {
    waitUntil: 'networkidle2'
  });

  const redirectUrl = await page.evaluate(() => {
    const a = document.getElementById('carrinho-produto-destaque');
    if (!a) return null;
    return a.href;
  })

  const random = uuidv4();
  const path = `./screenshots/${random}.png`
  
  if (!redirectUrl) {
    await page.screenshot({ path })
    return `FALHA: Produto Fora de linha. ${random}.png`;
  }

  await page.goto(redirectUrl, {
    waitUntil: 'networkidle2'
  })

  const pageIsOut = await page.evaluate(() => {
    return document.evaluate("//*[text() = 'oops!']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)?.singleNodeValue?.innerHTML 
  })

  if (pageIsOut) {
    await page.screenshot({ path })
    return `FALHA: Produto não foi encotrado. ${random}.png`
  }

  await page.screenshot({ path })
  return `SUCESSO: ${redirectUrl} . ${random}.png`
}

async function main() {
  const data = fs
    .readFileSync('./data.csv')
    .toString()
    .replace(/\r\n/gi, '|')
    .split('|');

  const browser = await p.launch();
  const page = await browser.newPage();
  page.setViewport({
    width: 1920,
    height: 1080
  })

  let done = 0;
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(data.length, 0);

  for (const url of data) {
    try {
      const response = await handleAnalysis({ url, page });
      fs.appendFileSync('./response.csv', `${url},${response}\n`)
      bar.update(done + 1);
      done += 1;
    } catch (err) {
      fs.appendFileSync('./errors.csv', `${url},${err}\n`)
    }
  }

  bar.stop();

  await browser.close();
}

main();