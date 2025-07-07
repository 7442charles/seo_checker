import axios from 'axios';
import * as cheerio from 'cheerio'; // ✅ FIXED

async function seoAnalyzer(url) {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const title = $('title').text();
  const description = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text();
  const h1Count = $('h1').length;
  const imgWithoutAlt = $('img:not([alt])').length;
  const hasRobots = $('meta[name="robots"]').length > 0;

  return {
    title,
    description,
    h1,
    h1Count,
    imgWithoutAlt,
    hasRobots
  };
}

export default seoAnalyzer;
