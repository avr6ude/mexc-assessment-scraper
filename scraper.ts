import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';


interface TokenData {
  base_token: string;
  counter_token: string;
  pair: string;
}

async function scrapeData(): Promise<TokenData[]> {
  const url = 'https://www.mexc.com/en-US/markets';
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  // Click the "Assessments" tab
  await page.waitForSelector('.scroll-subtabs_subMarketWrap__XVmHp');
  await page.click('.scroll-subtabs_subMarketWrap__XVmHp a:nth-child(4)');
  
  // Wait for the content to load after clicking the tab
  await page.waitForSelector('.marketList_symbolNameText__4DCPr');
  
  const allData: TokenData[] = [];

  
  while (true) {
    // Scrape token pairs from the current page
    const tokenPairs = await page.$$eval('.marketList_symbolNameText__4DCPr', (elements) => 
      elements.map((el) => el.textContent?.trim() || '')
    );

    
    for (const pair of tokenPairs) {
      const [base_token, counter_token] = pair.split('/');
      allData.push({
        base_token,
        counter_token,
        pair,
      });
    }
    
    // Check if there's a next page
    const isNextDisabled = await page.$eval('.ant-pagination-next', 
      (el) => el.classList.contains('ant-pagination-disabled')
    );
    
    if (isNextDisabled) {
      break;
    } else {
      await Promise.all([
        page.click('.ant-pagination-next'),
        //page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
    }
  }
  
  await browser.close();
  
  return allData 
}

async function saveToFile(data: TokenData[], filename: string): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  const filePath = path.join(process.cwd(), filename);
  await fs.writeFile(filePath, jsonData, 'utf8');
  console.log(`Data saved to ${filePath}`);
}

// Run the scraper and log the result
scrapeData()
  .then(async (result) =>{
    console.log(JSON.stringify(result, null, 2));
    await saveToFile(result, 'token_assessment_data.json');

  })
  .catch((error) => console.error('An error occurred:', error));