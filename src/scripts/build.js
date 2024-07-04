const contentful = require('contentful');
const fs = require('fs').promises;
const path = require('path');

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

async function getEntries() {
  const entries = await client.getEntries({
    content_type: '記事',
    order: '-fields.日時'
  });
  return entries.items;
}

async function buildSite() {
  const entries = await getEntries();

  // ホームページの更新
  await updateHomepage(entries.slice(0, 3));

  // お知らせ一覧の更新
  await updateNewsList(entries);

  // 個別記事ページの生成
  await generateArticlePages(entries);
}

async function updateHomepage(latestEntries) {
  let homeHtml = await fs.readFile('src/templates/home.html', 'utf-8');
  const newsSection = latestEntries.map(entry => `
    <div class="news-item">
      <span>${entry.fields.日時}</span>
      <a href="/news/${entry.fields.カテゴリー}/${entry.sys.id}.html">${entry.fields.タイトル}</a>
    </div>
  `).join('');
  
  homeHtml = homeHtml.replace('<!-- NEWS_PLACEHOLDER -->', newsSection);
  await fs.writeFile('public/index.html', homeHtml);
}

async function updateNewsList(entries) {
  let newsListHtml = await fs.readFile('src/templates/news-list.html', 'utf-8');
  const newsItems = entries.map(entry => `
    <div class="news-item">
      <h2>${entry.fields.タイトル}</h2>
      <span>${entry.fields.日時}</span>
      <span>${entry.fields.カテゴリー}</span>
      <img src="${entry.fields.画像.fields.file.url}" alt="${entry.fields.タイトル}">
      <p>${entry.fields.本文.substring(0, 50)}...</p>
      <a href="/news/${entry.fields.カテゴリー}/${entry.sys.id}.html">続きを読む</a>
    </div>
  `).join('');

  newsListHtml = newsListHtml.replace('<!-- NEWS_ITEMS_PLACEHOLDER -->', newsItems);
  await fs.writeFile('public/news/index.html', newsListHtml);
}

async function generateArticlePages(entries) {
  const articleTemplate = await fs.readFile('src/templates/article.html', 'utf-8');
  
  for (const entry of entries) {
    let articleHtml = articleTemplate;
    articleHtml = articleHtml.replace('{{TITLE}}', entry.fields.タイトル);
    articleHtml = articleHtml.replace('{{DATE}}', entry.fields.日時);
    articleHtml = articleHtml.replace('{{CATEGORY}}', entry.fields.カテゴリー);
    articleHtml = articleHtml.replace('{{IMAGE_URL}}', entry.fields.画像.fields.file.url);
    articleHtml = articleHtml.replace('{{CONTENT}}', entry.fields.本文);

    const filePath = `public/news/${entry.fields.カテゴリー}/${entry.sys.id}.html`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, articleHtml);
  }
}

buildSite().catch(console.error);
