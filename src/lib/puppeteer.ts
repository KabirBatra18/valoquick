import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface PdfOptions {
  headerTemplate?: string;
  footerTemplate?: string;
  marginTop?: string;
  marginBottom?: string;
}

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
    // Dynamic import — only loads full puppeteer (with bundled Chromium) locally
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
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

export async function htmlToPdfBase64(html: string, options?: PdfOptions): Promise<string> {
  // Hard timeout: 120 seconds for the entire operation
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('PDF generation timed out (120s)')), 120000);
  });

  const generatePdf = async (): Promise<string> => {
    const browser = await getBrowser();
    try {
      const page = await browser.newPage();

      page.setDefaultTimeout(60000);

      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Brief wait for base64 images to render (they're inline, should be instant)
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const images = document.querySelectorAll('img');
          if (images.length === 0) { resolve(); return; }

          let loaded = 0;
          const done = () => { loaded++; if (loaded >= images.length) resolve(); };
          images.forEach((img) => {
            if (img.complete) done();
            else { img.onload = done; img.onerror = done; }
          });

          // Safety: resolve after 5s regardless
          setTimeout(resolve, 5000);
        });
      });

      const useHeaderFooter = !!(options?.headerTemplate || options?.footerTemplate);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: options?.marginTop || '10mm',
          right: '10mm',
          bottom: options?.marginBottom || '10mm',
          left: '10mm',
        },
        printBackground: true,
        displayHeaderFooter: useHeaderFooter,
        ...(useHeaderFooter && {
          headerTemplate: options!.headerTemplate || '<span></span>',
          footerTemplate: options!.footerTemplate || '<span></span>',
        }),
        timeout: 60000,
      });

      return Buffer.from(pdfBuffer).toString('base64');
    } finally {
      await browser.close();
    }
  };

  try {
    return await Promise.race([generatePdf(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}
