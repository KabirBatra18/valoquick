import puppeteerCore from 'puppeteer-core';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

export async function getBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: true,
    });
  } else {
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
      ],
    });
  }
}

export async function htmlToPdfBase64(html: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  page.setDefaultTimeout(120000);
  await page.setJavaScriptEnabled(false);

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Wait for base64 images to finish rendering
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const images = document.querySelectorAll('img');
      let loadedCount = 0;
      const totalImages = images.length;

      if (totalImages === 0) {
        resolve();
        return;
      }

      const checkComplete = () => {
        loadedCount++;
        if (loadedCount >= totalImages) resolve();
      };

      images.forEach((img) => {
        if (img.complete) {
          checkComplete();
        } else {
          img.onload = checkComplete;
          img.onerror = checkComplete;
        }
      });

      setTimeout(resolve, 10000);
    });
  });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    printBackground: true,
  });

  await browser.close();
  return Buffer.from(pdfBuffer).toString('base64');
}
